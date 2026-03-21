import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.enums import TableStatus, UserRole
from app.schemas.table import (
    TableCreate, TableRead, TableSectionCreate, TableSectionRead,
    TableSectionWithTables, TableUpdate, TableWithSection,
)
from app.services import table as table_svc

router = APIRouter(prefix="/tables", tags=["Tables"])

_admin_only = Depends(require_roles(UserRole.admin))
_admin_manager = Depends(require_roles(UserRole.admin, UserRole.manager))


# ── Sections ──────────────────────────────────────────────────────────────────

@router.post("/sections", response_model=TableSectionRead, dependencies=[_admin_only])
def create_section(data: TableSectionCreate, db: Session = Depends(get_db)):
    return table_svc.create_section(db, data)


@router.get("/sections", response_model=List[TableSectionWithTables])
def list_sections(db: Session = Depends(get_db), _=Depends(get_current_user)):
    sections = table_svc.list_sections(db)
    result = []
    for section in sections:
        tables = table_svc.list_tables(db, section_id=section.id)
        s = TableSectionWithTables.model_validate(section)
        s.tables = [TableRead.model_validate(t) for t in tables]
        result.append(s)
    return result


# ── Tables ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=TableRead, dependencies=[_admin_only])
def create_table(data: TableCreate, db: Session = Depends(get_db)):
    return table_svc.create_table(db, data)


@router.get("/", response_model=List[TableWithSection])
def list_tables(
    section_id: Optional[uuid.UUID] = None,
    status: Optional[TableStatus] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return table_svc.list_tables(db, section_id, status)


@router.get("/{table_id}", response_model=TableWithSection)
def get_table(table_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return table_svc.get_table(db, table_id)


@router.patch("/{table_id}", response_model=TableRead, dependencies=[_admin_manager])
def update_table(table_id: uuid.UUID, data: TableUpdate, db: Session = Depends(get_db)):
    return table_svc.update_table(db, table_id, data)
