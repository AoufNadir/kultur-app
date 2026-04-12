from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.utils import create_record, delete_record, get_or_404, list_records, update_record
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.crm import Customer
from app.models.user import User
from app.schemas import ApiMessage, CustomerCreate, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/crm", tags=["crm"])


@router.get("/customers", response_model=list[CustomerRead])
def list_customers(
    search: str | None = None,
    status: str | None = None,
    source: str | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Customer]:
    return list_records(
        db,
        Customer,
        search=search,
        search_fields=("name", "phone", "email", "source", "status", "interest"),
        filters={"status": status, "source": source},
        offset=offset,
        limit=limit,
    )


@router.post("/customers", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Customer:
    return create_record(db, instance=Customer(**payload.model_dump()), actor=current_user, entity_type="Customer")


@router.patch("/customers/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Customer:
    return update_record(
        db,
        instance=get_or_404(db, Customer, customer_id),
        data=payload.model_dump(exclude_unset=True),
        actor=current_user,
        entity_type="Customer",
    )


@router.delete("/customers/{customer_id}", response_model=ApiMessage)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return delete_record(db, instance=get_or_404(db, Customer, customer_id), actor=current_user, entity_type="Customer")
