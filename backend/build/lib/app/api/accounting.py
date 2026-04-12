from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.utils import create_record, delete_record, get_or_404, list_records, update_record
from app.core.deps import require_roles
from app.db.session import get_db
from app.models.accounting import Transaction, Wallet
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


def _apply_wallet_effect(wallet: Wallet, transaction_type: str, amount, direction: int = 1) -> None:
    if transaction_type == "income":
        wallet.balance += amount * direction
    elif transaction_type == "expense":
        wallet.balance -= amount * direction


@router.get("/wallets", response_model=list[WalletRead])
def list_wallets(
    search: str | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ACCOUNTING_ROLES)),
) -> list[Wallet]:
    return list_records(db, Wallet, search=search, search_fields=("name", "currency"), offset=offset, limit=limit)


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
    return update_record(
        db,
        instance=get_or_404(db, Wallet, wallet_id),
        data=payload.model_dump(exclude_unset=True),
        actor=current_user,
        entity_type="Wallet",
    )


@router.delete("/wallets/{wallet_id}", response_model=ApiMessage)
def delete_wallet(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
) -> dict[str, str]:
    return delete_record(db, instance=get_or_404(db, Wallet, wallet_id), actor=current_user, entity_type="Wallet")


@router.get("/transactions", response_model=list[TransactionRead])
def list_transactions(
    search: str | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ACCOUNTING_ROLES)),
) -> list[Transaction]:
    return list_records(db, Transaction, search=search, search_fields=("type", "currency", "category"), offset=offset, limit=limit)


@router.post("/transactions", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accountant")),
) -> Transaction:
    wallet = get_or_404(db, Wallet, payload.wallet_id)
    if wallet.currency != payload.currency:
        raise HTTPException(status_code=400, detail="عملة الحركة يجب أن تطابق عملة المحفظة")
    transaction = Transaction(**payload.model_dump(), created_by_id=current_user.id)
    _apply_wallet_effect(wallet, transaction.type, transaction.amount)
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
    log_audit(
        db,
        actor=current_user,
        action="update_balance",
        entity_type="Wallet",
        entity_id=wallet.id,
        new_values=serialize_model(wallet),
    )
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
    _apply_wallet_effect(old_wallet, transaction.type, transaction.amount, direction=-1)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(transaction, field, value)
    new_wallet = get_or_404(db, Wallet, transaction.wallet_id)
    if new_wallet.currency != transaction.currency:
        raise HTTPException(status_code=400, detail="عملة الحركة يجب أن تطابق عملة المحفظة")
    _apply_wallet_effect(new_wallet, transaction.type, transaction.amount)
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
    _apply_wallet_effect(wallet, transaction.type, transaction.amount, direction=-1)
    return delete_record(db, instance=transaction, actor=current_user, entity_type="Transaction")
