from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas import AuditLogRead

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "executive")),
) -> list[AuditLog]:
    return db.query(AuditLog).order_by(AuditLog.id.desc()).offset(offset).limit(min(limit, 200)).all()
