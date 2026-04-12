from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.accounting import Wallet
from app.models.audit import AuditLog
from app.models.car import CarListing
from app.models.crm import Customer
from app.models.order import Order
from app.models.shipment import Shipment
from app.models.task import Task
from app.models.user import User
from app.schemas import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    counts = {
        "tasks": db.query(func.count(Task.id)).scalar() or 0,
        "customers": db.query(func.count(Customer.id)).scalar() or 0,
        "orders": db.query(func.count(Order.id)).scalar() or 0,
        "shipments": db.query(func.count(Shipment.id)).scalar() or 0,
        "cars": db.query(func.count(CarListing.id)).scalar() or 0,
        "wallets": db.query(func.count(Wallet.id)).scalar() or 0,
    }
    orders_by_status = {
        status: count
        for status, count in db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
    }
    wallet_balances = [
        {"name": name, "currency": currency, "balance": str(balance)}
        for name, currency, balance in db.query(Wallet.name, Wallet.currency, Wallet.balance).order_by(Wallet.name).all()
    ]
    order_total_by_currency = [
        {"currency": currency, "total": str(total or 0)}
        for currency, total in db.query(Order.currency, func.sum(Order.total_price)).group_by(Order.currency).all()
    ]
    latest_audit = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(10).all()
    return {
        "counts": counts,
        "orders_by_status": orders_by_status,
        "wallet_balances": wallet_balances,
        "order_total_by_currency": order_total_by_currency,
        "latest_audit": latest_audit,
    }
