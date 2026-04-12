from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.import_batch import ImportBatch
from app.models.user import User
from app.schemas import ImportBatchRead, ImportPreviewRead
from app.services.importer import commit_import, parse_column_map, parse_upload

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/preview", response_model=ImportPreviewRead)
async def preview_import(
    file: UploadFile = File(...),
    max_rows: int = Form(25),
    _: User = Depends(get_current_user),
) -> dict:
    parsed = await parse_upload(file, max_rows=max_rows)
    return {"filename": parsed.filename, "headers": parsed.headers, "rows": parsed.rows}


@router.post("/commit", response_model=ImportBatchRead)
async def commit_import_endpoint(
    file: UploadFile = File(...),
    target_module: str = Form(...),
    column_map: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportBatch:
    return await commit_import(
        db,
        file=file,
        target_module=target_module,
        column_map=parse_column_map(column_map),
        actor=current_user,
    )


@router.get("/batches", response_model=list[ImportBatchRead])
def list_import_batches(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ImportBatch]:
    return db.query(ImportBatch).order_by(ImportBatch.id.desc()).limit(100).all()
