from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.utils import create_record, delete_record, get_or_404, list_records, update_record
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.task import Task
from app.models.user import User
from app.schemas import ApiMessage, TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
def list_tasks(
    search: str | None = None,
    status: str | None = None,
    customer_id: int | None = None,
    order_id: int | None = None,
    assigned_to_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Task]:
    return list_records(
        db,
        Task,
        search=search,
        search_fields=("title", "status", "priority", "description"),
        filters={
            "status": status,
            "customer_id": customer_id,
            "order_id": order_id,
            "assigned_to_id": assigned_to_id,
        },
        offset=offset,
        limit=limit,
    )


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    task = Task(**payload.model_dump(), created_by_id=current_user.id)
    return create_record(db, instance=task, actor=current_user, entity_type="Task")


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    task = get_or_404(db, Task, task_id)
    return update_record(
        db,
        instance=task,
        data=payload.model_dump(exclude_unset=True),
        actor=current_user,
        entity_type="Task",
    )


@router.delete("/{task_id}", response_model=ApiMessage)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return delete_record(db, instance=get_or_404(db, Task, task_id), actor=current_user, entity_type="Task")
