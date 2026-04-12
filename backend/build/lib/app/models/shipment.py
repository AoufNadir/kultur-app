from datetime import date
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, TimestampMixin


class Shipment(TimestampMixin, Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True, index=True)
    tracking_number: Mapped[str | None] = mapped_column(String(120), unique=True, index=True)
    carrier: Mapped[str | None] = mapped_column(String(120), index=True)
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(60), default="pending", nullable=False, index=True)
    origin: Mapped[str | None] = mapped_column(String(255))
    destination: Mapped[str | None] = mapped_column(String(255))
    shipping_fee: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    shipped_at: Mapped[date | None] = mapped_column(nullable=True)
    delivered_at: Mapped[date | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text)

    order = relationship("Order", back_populates="shipments")
