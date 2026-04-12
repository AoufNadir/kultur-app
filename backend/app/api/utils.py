from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.services.audit import log_audit, serialize_model


def get_or_404(db: Session, model: type, object_id: int) -> Any:
    obj = db.get(model, object_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="السجل غير موجود")
    return obj


def list_records(
    db: Session,
    model: type,
    *,
    search: str | None = None,
    search_fields: tuple[str, ...] = (),
    filters: dict[str, Any] | None = None,
    date_field: str | None = None,
    date_from: Any | None = None,
    date_to: Any | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[Any]:
    query = db.query(model)
    if search and search_fields:
        search_filters = [getattr(model, field).ilike(f"%{search}%") for field in search_fields]
        query = query.filter(or_(*search_filters))
    if filters:
        for field, value in filters.items():
            if value is None or value == "" or value == "all":
                continue
            query = query.filter(getattr(model, field) == value)
    if date_field:
        column = getattr(model, date_field)
        if date_from is not None:
            query = query.filter(column >= date_from)
        if date_to is not None:
            query = query.filter(column <= date_to)
    return query.order_by(model.id.desc()).offset(offset).limit(min(limit, 200)).all()


def apply_update(instance: Any, data: dict[str, Any]) -> Any:
    for field, value in data.items():
        setattr(instance, field, value)
    return instance


def create_record(db: Session, *, instance: Any, actor: Any, entity_type: str) -> Any:
    db.add(instance)
    db.flush()
    log_audit(
        db,
        actor=actor,
        action="create",
        entity_type=entity_type,
        entity_id=instance.id,
        new_values=serialize_model(instance),
    )
    db.commit()
    db.refresh(instance)
    return instance


def update_record(
    db: Session,
    *,
    instance: Any,
    data: dict[str, Any],
    actor: Any,
    entity_type: str,
) -> Any:
    old_values = serialize_model(instance)
    apply_update(instance, data)
    db.flush()
    log_audit(
        db,
        actor=actor,
        action="update",
        entity_type=entity_type,
        entity_id=instance.id,
        old_values=old_values,
        new_values=serialize_model(instance),
    )
    db.commit()
    db.refresh(instance)
    return instance


def delete_record(db: Session, *, instance: Any, actor: Any, entity_type: str) -> dict[str, str]:
    old_values = serialize_model(instance)
    object_id = instance.id
    db.delete(instance)
    log_audit(
        db,
        actor=actor,
        action="delete",
        entity_type=entity_type,
        entity_id=object_id,
        old_values=old_values,
    )
    db.commit()
    return {"message": "تم حذف السجل"}
