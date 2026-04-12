from decimal import Decimal

from sqlalchemy import Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base, TimestampMixin


class CarListing(TimestampMixin, Base):
    __tablename__ = "car_listings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    make: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    year: Mapped[int | None] = mapped_column(nullable=True, index=True)
    source: Mapped[str | None] = mapped_column(String(255), index=True)
    specs: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(12), default="USD", nullable=False)
    margin: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(60), default="available", nullable=False, index=True)
