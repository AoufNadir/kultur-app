from fastapi import APIRouter

from app.api import accounting, audit, auth, cars, crm, dashboard, imports, orders, shipments, tasks, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(tasks.router)
api_router.include_router(crm.router)
api_router.include_router(orders.router)
api_router.include_router(shipments.router)
api_router.include_router(cars.router)
api_router.include_router(accounting.router)
api_router.include_router(dashboard.router)
api_router.include_router(imports.router)
api_router.include_router(audit.router)
