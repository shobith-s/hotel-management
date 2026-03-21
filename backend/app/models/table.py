from __future__ import annotations

from typing import TYPE_CHECKING, List
import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import TableStatus

if TYPE_CHECKING:
    from .order import Order


class TableSection(Base):
    __tablename__ = "table_sections"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True)

    tables: Mapped[List[Table]] = relationship("Table", back_populates="section")


class Table(Base):
    __tablename__ = "tables"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("table_sections.id"))
    table_number: Mapped[str] = mapped_column(String(20), unique=True)
    capacity: Mapped[int] = mapped_column(default=4)
    status: Mapped[TableStatus] = mapped_column(SAEnum(TableStatus), default=TableStatus.available)

    section: Mapped[TableSection] = relationship("TableSection", back_populates="tables")
    orders: Mapped[List[Order]] = relationship("Order", back_populates="table")
