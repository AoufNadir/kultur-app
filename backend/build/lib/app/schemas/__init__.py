from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ApiMessage(BaseModel):
    message: str


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    description: str | None = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    role_id: int
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    role_id: int | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    role: RoleRead | None = None
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: int | None = None
    action: str
    entity_type: str
    entity_id: str
    old_values: dict | None = None
    new_values: dict | None = None
    created_at: datetime


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: str = "open"
    priority: str = "medium"
    due_date: date | None = None
    assigned_to_id: int | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: date | None = None
    assigned_to_id: int | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: int | None = None
    created_at: datetime
    updated_at: datetime


class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str | None = None
    email: EmailStr | None = None
    source: str | None = None
    status: str = "lead"
    interest: str | None = None
    notes: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = None
    email: EmailStr | None = None
    source: str | None = None
    status: str | None = None
    interest: str | None = None
    notes: str | None = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class SupplierBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str | None = None
    email: EmailStr | None = None
    country: str | None = None
    notes: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = None
    email: EmailStr | None = None
    country: str | None = None
    notes: str | None = None


class SupplierRead(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class OrderBase(BaseModel):
    customer_id: int | None = None
    supplier_id: int | None = None
    status: str = "draft"
    currency: str = "USD"
    product_name: str = Field(min_length=1, max_length=255)
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Decimal("0")
    shipping_fee: Decimal = Decimal("0")
    notes: str | None = None


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    customer_id: int | None = None
    supplier_id: int | None = None
    status: str | None = None
    currency: str | None = None
    product_name: str | None = Field(default=None, min_length=1, max_length=255)
    quantity: int | None = Field(default=None, ge=1)
    unit_price: Decimal | None = None
    shipping_fee: Decimal | None = None
    notes: str | None = None


class OrderRead(OrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    total_price: Decimal
    created_at: datetime
    updated_at: datetime


class ShipmentBase(BaseModel):
    order_id: int | None = None
    tracking_number: str | None = None
    carrier: str | None = None
    weight_kg: Decimal = Decimal("0")
    status: str = "pending"
    origin: str | None = None
    destination: str | None = None
    shipping_fee: Decimal = Decimal("0")
    shipped_at: date | None = None
    delivered_at: date | None = None
    notes: str | None = None


class ShipmentCreate(ShipmentBase):
    pass


class ShipmentUpdate(BaseModel):
    order_id: int | None = None
    tracking_number: str | None = None
    carrier: str | None = None
    weight_kg: Decimal | None = None
    status: str | None = None
    origin: str | None = None
    destination: str | None = None
    shipping_fee: Decimal | None = None
    shipped_at: date | None = None
    delivered_at: date | None = None
    notes: str | None = None


class ShipmentRead(ShipmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CarListingBase(BaseModel):
    make: str = Field(min_length=1, max_length=120)
    model: str = Field(min_length=1, max_length=120)
    year: int | None = None
    source: str | None = None
    specs: str | None = None
    price: Decimal = Decimal("0")
    currency: str = "USD"
    margin: Decimal = Decimal("0")
    status: str = "available"


class CarListingCreate(CarListingBase):
    pass


class CarListingUpdate(BaseModel):
    make: str | None = Field(default=None, min_length=1, max_length=120)
    model: str | None = Field(default=None, min_length=1, max_length=120)
    year: int | None = None
    source: str | None = None
    specs: str | None = None
    price: Decimal | None = None
    currency: str | None = None
    margin: Decimal | None = None
    status: str | None = None


class CarListingRead(CarListingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class WalletBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    currency: str = "USD"
    balance: Decimal = Decimal("0")
    description: str | None = None


class WalletCreate(WalletBase):
    pass


class WalletUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    currency: str | None = None
    balance: Decimal | None = None
    description: str | None = None


class WalletRead(WalletBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class TransactionBase(BaseModel):
    wallet_id: int
    type: str = Field(pattern="^(income|expense|transfer)$")
    amount: Decimal
    currency: str = "USD"
    category: str | None = None
    description: str | None = None
    occurred_at: date
    related_order_id: int | None = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    wallet_id: int | None = None
    type: str | None = Field(default=None, pattern="^(income|expense|transfer)$")
    amount: Decimal | None = None
    currency: str | None = None
    category: str | None = None
    description: str | None = None
    occurred_at: date | None = None
    related_order_id: int | None = None


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: int | None = None
    created_at: datetime
    updated_at: datetime


class ImportBatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    target_module: str
    status: str
    total_rows: int
    successful_rows: int
    failed_rows: int
    column_map: dict | None = None
    errors: list | None = None
    created_by_id: int | None = None
    created_at: datetime
    updated_at: datetime


class ImportPreviewRead(BaseModel):
    filename: str
    headers: list[str]
    rows: list[dict]


class DashboardSummary(BaseModel):
    counts: dict[str, int]
    orders_by_status: dict[str, int]
    wallet_balances: list[dict]
    order_total_by_currency: list[dict]
    latest_audit: list[AuditLogRead]
