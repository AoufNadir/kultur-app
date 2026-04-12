from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.utils import get_or_404, list_records, update_record
from app.core.deps import get_current_user, require_roles
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas import ApiMessage, RoleRead, UserCreate, UserRead, UserUpdate
from app.services.audit import log_audit, serialize_model

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/staff", response_model=list[UserRead])
def list_staff(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[User]:
    return db.query(User).filter(User.is_active.is_(True)).order_by(User.full_name.asc()).all()


@router.get("/roles", response_model=list[RoleRead])
def list_roles(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> list[Role]:
    return db.query(Role).order_by(Role.id.asc()).all()


@router.get("", response_model=list[UserRead])
def list_users(
    search: str | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> list[User]:
    return list_records(db, User, search=search, search_fields=("email", "full_name"), offset=offset, limit=limit)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> User:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="البريد الإلكتروني مستخدم مسبقا")
    if not db.get(Role, payload.role_id):
        raise HTTPException(status_code=400, detail="الدور غير موجود")
    user = User(
        email=str(payload.email),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        is_active=payload.is_active,
        role_id=payload.role_id,
    )
    db.add(user)
    db.flush()
    log_audit(
        db,
        actor=current_user,
        action="create",
        entity_type="User",
        entity_id=user.id,
        new_values=serialize_model(user),
    )
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> User:
    user = get_or_404(db, User, user_id)
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and db.query(User).filter(User.email == data["email"], User.id != user_id).first():
        raise HTTPException(status_code=409, detail="البريد الإلكتروني مستخدم مسبقا")
    if "password" in data:
        data["hashed_password"] = get_password_hash(data.pop("password"))
    return update_record(db, instance=user, data=data, actor=current_user, entity_type="User")


@router.delete("/{user_id}", response_model=ApiMessage)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, str]:
    user = get_or_404(db, User, user_id)
    return update_record(
        db,
        instance=user,
        data={"is_active": False},
        actor=current_user,
        entity_type="User",
    ) and {"message": "تم تعطيل المستخدم"}
