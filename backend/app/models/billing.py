from __future__ import annotations

from typing import TYPE_CHECKING, Optional
import uuid
from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import PaymentMode, PaymentStatus

if TYPE_CHECKING:
    from .order import Order
    from .user import User


class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("orders.id"), unique=True)
    bill_number: Mapped[str] = mapped_column(String(30), unique=True)   # format: B-YYYYMMDD-NNN
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2))
    cgst_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    sgst_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    igst_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    service_charge: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    grand_total: Mapped[float] = mapped_column(Numeric(10, 2))
    payment_mode: Mapped[Optional[PaymentMode]] = mapped_column(SAEnum(PaymentMode), nullable=True)
    payment_status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.pending)
    served_by: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    paid_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    order: Mapped[Order] = relationship("Order", back_populates="bill")
    served_by_user: Mapped[User] = relationship("User", back_populates="bills")
