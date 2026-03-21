from __future__ import annotations

from typing import TYPE_CHECKING, Optional
import uuid
from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import AuditAction

if TYPE_CHECKING:
    from .user import User
    from .order import Order, OrderItem


class OrderAuditLog(Base):
    __tablename__ = "order_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("orders.id"))
    order_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("order_items.id"), nullable=True)
    action: Mapped[AuditAction] = mapped_column(SAEnum(AuditAction))
    performed_by: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    order: Mapped[Order] = relationship("Order", back_populates="audit_logs")
    performed_by_user: Mapped[User] = relationship("User", back_populates="audit_logs", foreign_keys=[performed_by])
