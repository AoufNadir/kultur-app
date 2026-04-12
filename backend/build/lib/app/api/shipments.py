from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.utils import create_record, delete_record, get_or_404, list_records, update_record
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.shipment import Shipment
from app.models.user import User
from app.schemas import ApiMessage, ShipmentCreate, ShipmentRead, ShipmentUpdate

router = APIRouter(prefix="/shipments", tags=["shipments"])


@router.get("", response_model=list[ShipmentRead])
def list_shipments(
    search: str | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Shipment]:
    return list_records(db, Shipment, search=search, search_fields=("tracking_number", "carrier", "status", "origin", "destination"), offset=offset, limit=limit)


@router.post("", response_model=ShipmentRead, status_code=status.HTTP_201_CREATED)
def create_shipment(
    payload: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Shipment:
    return create_record(db, instance=Shipment(**payload.model_dump()), actor=current_user, entity_type="Shipment")


@router.patch("/{shipment_id}", response_model=ShipmentRead)
def update_shipment(
    shipment_id: int,
    payload: ShipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Shipment:
    return update_record(
        db,
        instance=get_or_404(db, Shipment, shipment_id),
        data=payload.model_dump(exclude_unset=True),
        actor=current_user,
        entity_type="Shipment",
    )


@router.delete("/{shipment_id}", response_model=ApiMessage)
def delete_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return delete_record(db, instance=get_or_404(db, Shipment, shipment_id), actor=current_user, entity_type="Shipment")
