from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.session import Base, engine
from app.models.user import Role, User

ROLE_SEED = [
    ("admin", "المدير", "إدارة المستخدمين والصلاحيات وكل البيانات"),
    ("shipping", "موظف الشحن", "إنشاء وتحديث سجلات الشحن"),
    ("sales", "مندوب المبيعات", "إدارة العملاء والطلبات وعروض الأسعار"),
    ("accountant", "المحاسب", "إدارة المحافظ والحركات المالية"),
    ("executive", "المدير التنفيذي", "قراءة المؤشرات والتقارير"),
]


def create_tables_if_enabled() -> None:
    settings = get_settings()
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)


def seed_roles_and_admin(db: Session) -> None:
    settings = get_settings()
    roles_by_slug = {role.slug: role for role in db.query(Role).all()}
    for slug, name, description in ROLE_SEED:
        if slug not in roles_by_slug:
            role = Role(slug=slug, name=name, description=description)
            db.add(role)
            roles_by_slug[slug] = role
    db.flush()

    user_exists = db.query(User).filter(User.email == settings.first_superuser_email).first()
    if not user_exists:
        db.add(
            User(
                email=settings.first_superuser_email,
                full_name=settings.first_superuser_name,
                hashed_password=get_password_hash(settings.first_superuser_password),
                role_id=roles_by_slug["admin"].id,
            )
        )
    db.commit()
