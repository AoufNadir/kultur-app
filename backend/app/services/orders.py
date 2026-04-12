from decimal import Decimal

from app.models.order import Order


def calculate_order_total(quantity: int, unit_price: Decimal, shipping_fee: Decimal) -> Decimal:
    return (Decimal(quantity) * Decimal(unit_price)) + Decimal(shipping_fee)


def refresh_order_total(order: Order) -> None:
    order.total_price = calculate_order_total(order.quantity, order.unit_price, order.shipping_fee)
