from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User


def json_safe(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {key: json_safe(inner) for key, inner in value.items()}
    if isinstance(value, list):
        return [json_safe(inner) for inner in value]
    return value


def serialize_model(instance: Any) -> dict:
    return {
        column.name: json_safe(getattr(instance, column.name))
        for column in instance.__table__.columns
        if column.name != "hashed_password"
    }


def log_audit(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: str | int,
    old_values: dict | None = None,
    new_values: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            old_values=json_safe(old_values),
            new_values=json_safe(new_values),
        )
    )
