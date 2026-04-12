from datetime import date
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, TimestampMixin


class Wallet(TimestampMixin, Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    currency: Mapped[str] = mapped_column(String(12), default="USD", nullable=False, index=True)
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="wallet",
        foreign_keys="Transaction.wallet_id",
    )
    incoming_transfers: Mapped[list["Transaction"]] = relationship(
        foreign_keys="Transaction.to_wallet_id",
        back_populates="to_wallet",
    )


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    wallet_id: Mapped[int] = mapped_column(ForeignKey("wallets.id"), nullable=False, index=True)
    to_wallet_id: Mapped[int | None] = mapped_column(ForeignKey("wallets.id"), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(12), default="USD", nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(120), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    occurred_at: Mapped[date] = mapped_column(nullable=False, index=True)
    related_order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    wallet: Mapped[Wallet] = relationship(back_populates="transactions", foreign_keys=[wallet_id])
    to_wallet: Mapped[Wallet | None] = relationship(foreign_keys=[to_wallet_id], back_populates="incoming_transfers")
    created_by = relationship("User")
    related_order = relationship("Order", back_populates="transactions")
