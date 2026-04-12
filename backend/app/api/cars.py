from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.utils import create_record, delete_record, get_or_404, list_records, update_record
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.car import CarListing
from app.models.user import User
from app.schemas import ApiMessage, CarListingCreate, CarListingRead, CarListingUpdate

router = APIRouter(prefix="/cars", tags=["cars"])


@router.get("", response_model=list[CarListingRead])
def list_cars(
    search: str | None = None,
    status: str | None = None,
    currency: str | None = None,
    customer_id: int | None = None,
    order_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CarListing]:
    return list_records(
        db,
        CarListing,
        search=search,
        search_fields=("make", "model", "source", "status", "currency"),
        filters={
            "status": status,
            "currency": currency,
            "customer_id": customer_id,
            "order_id": order_id,
        },
        offset=offset,
        limit=limit,
    )


@router.post("", response_model=CarListingRead, status_code=status.HTTP_201_CREATED)
def create_car(
    payload: CarListingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CarListing:
    return create_record(db, instance=CarListing(**payload.model_dump()), actor=current_user, entity_type="CarListing")


@router.patch("/{car_id}", response_model=CarListingRead)
def update_car(
    car_id: int,
    payload: CarListingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CarListing:
    return update_record(
        db,
        instance=get_or_404(db, CarListing, car_id),
        data=payload.model_dump(exclude_unset=True),
        actor=current_user,
        entity_type="CarListing",
    )


@router.delete("/{car_id}", response_model=ApiMessage)
def delete_car(
    car_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return delete_record(db, instance=get_or_404(db, CarListing, car_id), actor=current_user, entity_type="CarListing")
