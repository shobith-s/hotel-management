from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.enums import TableStatus
from app.models.table import Table, TableSection
from app.schemas.table import TableCreate, TableSectionCreate, TableUpdate


# ── Sections ──────────────────────────────────────────────────────────────────

def create_section(db: Session, data: TableSectionCreate) -> TableSection:
    section = TableSection(**data.model_dump())
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


def get_section(db: Session, section_id: uuid.UUID) -> TableSection:
    section = db.get(TableSection, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return section


def list_sections(db: Session) -> List[TableSection]:
    return db.query(TableSection).all()


# ── Tables ────────────────────────────────────────────────────────────────────

def create_table(db: Session, data: TableCreate) -> Table:
    get_section(db, data.section_id)   # validate section exists
    table = Table(**data.model_dump())
    db.add(table)
    db.commit()
    db.refresh(table)
    return table


def get_table(db: Session, table_id: uuid.UUID) -> Table:
    table = db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table


def list_tables(
    db: Session,
    section_id: Optional[uuid.UUID] = None,
    status: Optional[TableStatus] = None,
) -> List[Table]:
    q = db.query(Table)
    if section_id:
        q = q.filter(Table.section_id == section_id)
    if status:
        q = q.filter(Table.status == status)
    return q.all()


def update_table(db: Session, table_id: uuid.UUID, data: TableUpdate) -> Table:
    table = get_table(db, table_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(table, field, value)
    db.commit()
    db.refresh(table)
    return table


# ── Table Merging ─────────────────────────────────────────────────────────────

def merge_tables(db: Session, table_ids: List[uuid.UUID]) -> List[Table]:
    if len(table_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 tables required to merge")

    tables = [get_table(db, tid) for tid in table_ids]

    for table in tables:
        if table.status not in (TableStatus.available, TableStatus.reserved):
            raise HTTPException(
                status_code=400,
                detail=f"Table {table.table_number} is {table.status.value} and cannot be merged",
            )

    group_id = uuid.uuid4()
    for table in tables:
        table.merge_group_id = group_id
        table.status = TableStatus.occupied

    db.commit()
    for table in tables:
        db.refresh(table)
    return tables


def unmerge_tables(db: Session, merge_group_id: uuid.UUID) -> List[Table]:
    tables = db.query(Table).filter(Table.merge_group_id == merge_group_id).all()
    if not tables:
        raise HTTPException(status_code=404, detail="Merge group not found")

    for table in tables:
        table.merge_group_id = None
        # Only reset status if the table has no active orders
        if table.status == TableStatus.occupied:
            from app.models.order import Order
            from app.models.enums import OrderStatus
            active = db.query(Order).filter(
                Order.table_id == table.id,
                Order.status == OrderStatus.open,
            ).first()
            if not active:
                table.status = TableStatus.available

    db.commit()
    for table in tables:
        db.refresh(table)
    return tables
