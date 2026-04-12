from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.utils import create_record, delete_record, get_or_404, list_records, update_record
from app.core.deps import require_roles
from app.db.session import get_db
from app.models.accounting import Transaction, Wallet
from app.models.order import Order
from app.models.user import User
from app.schemas import (
    ApiMessage,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
    WalletCreate,
    WalletRead,
    WalletUpdate,
)
from app.services.audit import log_audit, serialize_model

router = APIRouter(prefix="/accounting", tags=["accounting"])

ACCOUNTING_ROLES = ("admin", "accountant", "executive")


def _apply_wallet_effect(
    wallet: Wallet,
    transaction_type: str,
    amount,
    *,
    direction: int = 1,
    to_wallet: Wallet | None = None,
) -> None:
    if transaction_type == "income":
        wallet.balance += amount * direction
    elif transaction_type == "expense":
        wallet.balance -= amount * direction
    elif transaction_type == "transfer" and to_wallet:
        wallet.balance -= amount * direction
        to_wallet.balance += amount * direction


def _wallet_has_transactions(db: Session, wallet_id: int) -> bool:
    return db.query(Transaction.id).filter(
        or_(Transaction.wallet_id == wallet_id, Transaction.to_wallet_id == wallet_id),
    ).first() is not None


def _validate_order_currency(db: Session, related_order_id: int | None, currency: str) -> None:
    if related_order_id is None:
        return
    order = get_or_404(db, Order, related_order_id)
    if order.currency != currency:
        raise HTTPException(status_code=400, detail="عملة الحركة يجب أن تطابق عملة الطلبية المرتبطة")


def _validate_transaction_links(
    db: Session,
    *,
    wallet: Wallet,
    transaction_type: str,
    currency: str,
    to_wallet_id: int | None,
    related_order_id: int | None,
) -> Wallet | None:
    if wallet.currency != currency:
        raise HTTPException(status_code=400, detail="عملة الحركة يجب أن تطابق عملة المحفظة")
    if transaction_type == "transfer":
        if related_order_id is not None:
            raise HTTPException(status_code=400, detail="التحويل بين المحافظ لا يرتبط بطلبية")
        if to_wallet_id is None:
            raise HTTPException(status_code=400, detail="اختر محفظة الوجهة للتحويل")
        if to_wallet_id == wallet.id:
            raise HTTPException(status_code=400, detail="لا يمكن التحويل إلى نفس المحفظة")
        to_wallet = get_or_404(db, Wallet, to_wallet_id)
        if to_wallet.currency != wallet.currency:
            raise HTTPException(status_code=400, detail="التحويل متاح فقط بين محافظ بنفس العملة")
        return to_wallet
    if to_wallet_id is not None:
        raise HTTPException(status_code=400, detail="محفظة الوجهة تستخدم فقط مع التحويل")
    _validate_order_currency(db, related_order_id, currency)
    return None


def _log_wallet_balance(db: Session, current_user: User, *wallets: Wallet | None) -> None:
    seen: set[int] = set()
    for wallet in wallets:
        if wallet is None or wallet.id in seen:
            continue
        seen.add(wallet.id)
        log_audit(
            db,
            actor=current_user,
            action="update_balance",
            entity_type="Wallet",
            entity_id=wallet.id,
            new_values=serialize_model(wallet),
        )


@router.get("/wallets", response_model=list[WalletRead])
def list_wallets(
    search: str | None = None,
    currency: str | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ACCOUNTING_ROLES)),
) -> list[Wallet]:
    return list_records(
        db,
        Wallet,
        search=search,
        search_fields=("name", "currency"),
        filters={"currency": currency},
        offset=offset,
        limit=limit,
    )


@router.post("/wallets", response_model=WalletRead, status_code=status.HTTP_201_CREATED)
def create_wallet(
    payload: WalletCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
) -> Wallet:
    return create_record(db, instance=Wallet(**payload.model_dump()), actor=current_user, entity_type="Wallet")


@router.patch("/wallets/{wallet_id}", response_model=WalletRead)
def update_wallet(
    wallet_id: int,
    payload: WalletUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
) -> Wallet:
    data = payload.model_dump(exclude_unset=True)
    wallet = get_or_404(db, Wallet, wallet_id)
    if _wallet_has_transactions(db, wallet_id):
        if "currency" in data and data["currency"] != wallet.currency:
            raise HTTPException(status_code=400, detail="لا يمكن تغيير عملة محفظة عليها حركات مالية")
        if "balance" in data and data["balance"] != wallet.balance:
            raise HTTPException(status_code=400, detail="رصيد المحفظة يتغير من الحركات المالية فقط")
    return update_record(
        db,
        instance=wallet,
        data=data,
        actor=current_user,
        entity_type="Wallet",
    )


@router.delete("/wallets/{wallet_id}", response_model=ApiMessage)
def delete_wallet(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
) -> dict[str, str]:
    if _wallet_has_transactions(db, wallet_id):
        raise HTTPException(status_code=400, detail="لا يمكن حذف محفظة عليها حركات مالية")
    return delete_record(db, instance=get_or_404(db, Wallet, wallet_id), actor=current_user, entity_type="Wallet")


@router.get("/transactions", response_model=list[TransactionRead])
def list_transactions(
    search: str | None = None,
    type: str | None = None,
    currency: str | None = None,
    wallet_id: int | None = None,
    order_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ACCOUNTING_ROLES)),
) -> list[Transaction]:
    query = db.query(Transaction)
    if search:
        query = query.filter(
            or_(
                Transaction.type.ilike(f"%{search}%"),
                Transaction.currency.ilike(f"%{search}%"),
                Transaction.category.ilike(f"%{search}%"),
                Transaction.description.ilike(f"%{search}%"),
            )
        )
    if type and type != "all":
        query = query.filter(Transaction.type == type)
    if currency and currency != "all":
        query = query.filter(Transaction.currency == currency)
    if wallet_id is not None:
        query = query.filter(or_(Transaction.wallet_id == wallet_id, Transaction.to_wallet_id == wallet_id))
    if order_id is not None:
        query = query.filter(Transaction.related_order_id == order_id)
    if date_from is not None:
        query = query.filter(Transaction.occurred_at >= date_from)
    if date_to is not None:
        query = query.filter(Transaction.occurred_at <= date_to)
    return query.order_by(Transaction.id.desc()).offset(offset).limit(min(limit, 200)).all()


@router.post("/transactions", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
) -> Transaction:
    wallet = get_or_404(db, Wallet, payload.wallet_id)
    to_wallet = _validate_transaction_links(
        db,
        wallet=wallet,
        transaction_type=payload.type,
        currency=payload.currency,
        to_wallet_id=payload.to_wallet_id,
        related_order_id=payload.related_order_id,
    )
    transaction = Transaction(**payload.model_dump(), created_by_id=current_user.id)
    _apply_wallet_effect(wallet, transaction.type, transaction.amount, to_wallet=to_wallet)
    db.add(transaction)
    db.flush()
    log_audit(
        db,
        actor=current_user,
        action="create",
        entity_type="Transaction",
        entity_id=transaction.id,
        new_values=serialize_model(transaction),
    )
    _log_wallet_balance(db, current_user, wallet, to_wallet)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.patch("/transactions/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
) -> Transaction:
    transaction = get_or_404(db, Transaction, transaction_id)
    old_values = serialize_model(transaction)
    old_wallet = get_or_404(db, Wallet, transaction.wallet_id)
    old_to_wallet = get_or_404(db, Wallet, transaction.to_wallet_id) if transaction.to_wallet_id else None
    data = payload.model_dump(exclude_unset=True)

    next_wallet_id = data.get("wallet_id", transaction.wallet_id)
    next_type = data.get("type", transaction.type)
    next_amount = data.get("amount", transaction.amount)
    next_currency = data.get("currency", transaction.currency)
    next_to_wallet_id = data.get("to_wallet_id", transaction.to_wallet_id)
    next_related_order_id = data.get("related_order_id", transaction.related_order_id)
    new_wallet = get_or_404(db, Wallet, next_wallet_id)
    new_to_wallet = _validate_transaction_links(
        db,
        wallet=new_wallet,
        transaction_type=next_type,
        currency=next_currency,
        to_wallet_id=next_to_wallet_id,
        related_order_id=next_related_order_id,
    )

    _apply_wallet_effect(
        old_wallet,
        transaction.type,
        transaction.amount,
        direction=-1,
        to_wallet=old_to_wallet,
    )
    for field, value in data.items():
        setattr(transaction, field, value)
    _apply_wallet_effect(new_wallet, transaction.type, transaction.amount, to_wallet=new_to_wallet)
    db.flush()
    log_audit(
        db,
        actor=current_user,
        action="update",
        entity_type="Transaction",
        entity_id=transaction.id,
        old_values=old_values,
        new_values=serialize_model(transaction),
    )
    _log_wallet_balance(db, current_user, old_wallet, old_to_wallet, new_wallet, new_to_wallet)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/transactions/{transaction_id}", response_model=ApiMessage)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
) -> dict[str, str]:
    transaction = get_or_404(db, Transaction, transaction_id)
    wallet = get_or_404(db, Wallet, transaction.wallet_id)
    to_wallet = get_or_404(db, Wallet, transaction.to_wallet_id) if transaction.to_wallet_id else None
    old_values = serialize_model(transaction)
    _apply_wallet_effect(
        wallet,
        transaction.type,
        transaction.amount,
        direction=-1,
        to_wallet=to_wallet,
    )
    db.delete(transaction)
    log_audit(
        db,
        actor=current_user,
        action="delete",
        entity_type="Transaction",
        entity_id=transaction_id,
        old_values=old_values,
    )
    _log_wallet_balance(db, current_user, wallet, to_wallet)
    db.commit()
    return {"message": "تم حذف السجل"}
