from __future__ import annotations

import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import TableStatus


class MergeRequest(BaseModel):
    table_ids: list[uuid.UUID]


class TableSectionCreate(BaseModel):
    name: str


class TableSectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class TableSectionWithTables(TableSectionRead):
    tables: List[TableRead] = []


# ── Tables ────────────────────────────────────────────────────────────────────

class TableCreate(BaseModel):
    section_id: uuid.UUID
    table_number: str
    capacity: int = 4


class TableUpdate(BaseModel):
    section_id: Optional[uuid.UUID] = None
    table_number: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[TableStatus] = None
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None


class TableRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    section_id: uuid.UUID
    table_number: str
    capacity: int
    status: TableStatus
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None
    merge_group_id: Optional[uuid.UUID] = None


class TableWithSection(TableRead):
    section: TableSectionRead


# Resolve forward reference
TableSectionWithTables.model_rebuild()
