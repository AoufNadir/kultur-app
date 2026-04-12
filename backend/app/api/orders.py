from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.utils import create_record, delete_record, get_or_404, list_records, update_record
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.accounting import Transaction
from app.models.crm import Supplier
from app.models.order import Order
from app.models.shipment import Shipment
from app.models.user import User
from app.schemas import (
    ApiMessage,
    OrderCreate,
    OrderRead,
    OrderUpdate,
    SupplierCreate,
    SupplierRead,
    SupplierUpdate,
)
from app.services.audit import log_audit, serialize_model
from app.services.orders import refresh_order_total

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/suppliers", response_model=list[SupplierRead])
def list_suppliers(
    search: str | None = None,
    country: str | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Supplier]:
    return list_records(
        db,
        Supplier,
        search=search,
        search_fields=("name", "phone", "email", "country"),
        filters={"country": country},
        offset=offset,
        limit=limit,
    )


@router.post("/suppliers", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Supplier:
    return create_record(db, instance=Supplier(**payload.model_dump()), actor=current_user, entity_type="Supplier")


@router.patch("/suppliers/{supplier_id}", response_model=SupplierRead)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Supplier:
    return update_record(
        db,
        instance=get_or_404(db, Supplier, supplier_id),
        data=payload.model_dump(exclude_unset=True),
        actor=current_user,
        entity_type="Supplier",
    )


@router.delete("/suppliers/{supplier_id}", response_model=ApiMessage)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return delete_record(db, instance=get_or_404(db, Supplier, supplier_id), actor=current_user, entity_type="Supplier")


@router.get("", response_model=list[OrderRead])
def list_orders(
    search: str | None = None,
    status: str | None = None,
    currency: str | None = None,
    customer_id: int | None = None,
    supplier_id: int | None = None,
    assigned_to_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Order]:
    return list_records(
        db,
        Order,
        search=search,
        search_fields=("product_name", "status", "priority", "current_location", "currency"),
        filters={
            "status": status,
            "currency": currency,
            "customer_id": customer_id,
            "supplier_id": supplier_id,
            "assigned_to_id": assigned_to_id,
        },
        offset=offset,
        limit=limit,
    )


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Order:
    order = Order(**payload.model_dump())
    refresh_order_total(order)
    return create_record(db, instance=order, actor=current_user, entity_type="Order")


@router.patch("/{order_id}", response_model=OrderRead)
def update_order(
    order_id: int,
    payload: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Order:
    order = get_or_404(db, Order, order_id)
    old_values = serialize_model(order)
    data = payload.model_dump(exclude_unset=True)
    if "currency" in data and data["currency"] != order.currency:
        has_transactions = db.query(Transaction.id).filter(Transaction.related_order_id == order_id).first()
        if has_transactions:
            raise HTTPException(status_code=400, detail="لا يمكن تغيير عملة طلبية مرتبطة بحركات مالية")
    for field, value in data.items():
        setattr(order, field, value)
    refresh_order_total(order)
    db.flush()
    log_audit(
        db,
        actor=current_user,
        action="update",
        entity_type="Order",
        entity_id=order.id,
        old_values=old_values,
        new_values=serialize_model(order),
    )
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", response_model=ApiMessage)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    if db.query(Shipment.id).filter(Shipment.order_id == order_id).first():
        raise HTTPException(status_code=400, detail="لا يمكن حذف طلبية مرتبطة بشحنات")
    if db.query(Transaction.id).filter(Transaction.related_order_id == order_id).first():
        raise HTTPException(status_code=400, detail="لا يمكن حذف طلبية مرتبطة بحركات مالية")
    return delete_record(db, instance=get_or_404(db, Order, order_id), actor=current_user, entity_type="Order")
