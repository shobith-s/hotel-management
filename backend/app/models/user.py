from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum as SAEnum, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import UserRole

if TYPE_CHECKING:
    from .order import Order, OrderItem
    from .billing import Bill
    from .lodge import Booking
    from .audit import OrderAuditLog


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    orders: Mapped[List[Order]] = relationship("Order", back_populates="waiter", foreign_keys="Order.waiter_id")
    voided_items: Mapped[List[OrderItem]] = relationship("OrderItem", back_populates="voided_by_user", foreign_keys="OrderItem.voided_by")
    bills: Mapped[List[Bill]] = relationship("Bill", back_populates="served_by_user")
    bookings: Mapped[List[Booking]] = relationship("Booking", back_populates="checked_in_by_user")
    audit_logs: Mapped[List[OrderAuditLog]] = relationship("OrderAuditLog", back_populates="performed_by_user", foreign_keys="OrderAuditLog.performed_by")
