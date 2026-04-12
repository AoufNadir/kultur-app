from collections.abc import Generator
from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import api_router
from app.core.security import get_password_hash
from app.db.session import Base, get_db
from app.models import accounting, audit, car, crm, import_batch, order, shipment, task, user  # noqa: F401
from app.models.user import Role, User

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    admin_role = Role(slug="admin", name="المدير", description=None)
    accountant_role = Role(slug="accountant", name="المحاسب", description=None)
    db.add_all([admin_role, accountant_role])
    db.flush()
    db.add(
        User(
            email="admin@kultur-dz.com",
            full_name="مدير النظام",
            hashed_password=get_password_hash("ChangeMe123!"),
            role_id=admin_role.id,
        )
    )
    db.commit()
    db.close()

    test_app = FastAPI()
    test_app.include_router(api_router)

    def override_get_db() -> Generator:
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    test_app.dependency_overrides[get_db] = override_get_db
    with TestClient(test_app) as test_client:
        yield test_client


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/auth/login",
        data={"username": "admin@kultur-dz.com", "password": "ChangeMe123!"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def today() -> date:
    return date(2026, 4, 11)
