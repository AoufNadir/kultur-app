from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, TimestampMixin


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True, index=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True, index=True)
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(60), default="لم تبدأ", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(40), default="عادية", nullable=False, index=True)
    current_location: Mapped[str] = mapped_column(String(120), default="لم تحدد", nullable=False, index=True)
    currency: Mapped[str] = mapped_column(String(12), default="USD", nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    shipping_fee: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    customer = relationship("Customer")
    supplier = relationship("Supplier")
    assigned_to = relationship("User")
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
    )
    shipments = relationship("Shipment", back_populates="order")
    transactions = relationship("Transaction", back_populates="related_order")

    @property
    def paid_amount(self) -> Decimal:
        return sum(
            (transaction.amount for transaction in self.transactions if transaction.type == "income"),
            Decimal("0"),
        )

    @property
    def expense_amount(self) -> Decimal:
        return sum(
            (transaction.amount for transaction in self.transactions if transaction.type == "expense"),
            Decimal("0"),
        )

    @property
    def remaining_amount(self) -> Decimal:
        remaining = self.total_price - self.paid_amount
        return max(remaining, Decimal("0"))

    @property
    def payment_status(self) -> str:
        if self.paid_amount <= 0:
            return "غير مدفوع"
        if self.remaining_amount <= 0:
            return "مدفوع"
        return "مدفوع جزئيا"


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)

    order: Mapped[Order] = relationship(back_populates="items")
