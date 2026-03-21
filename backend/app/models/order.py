from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import OrderSource, OrderStatus

if TYPE_CHECKING:
    from .user import User
    from .table import Table
    from .menu import MenuItem, MenuItemVariant
    from .billing import Bill
    from .audit import OrderAuditLog


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tables.id"))
    waiter_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    status: Mapped[OrderStatus] = mapped_column(SAEnum(OrderStatus), default=OrderStatus.open)
    order_source: Mapped[OrderSource] = mapped_column(SAEnum(OrderSource), default=OrderSource.manual)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    table: Mapped[Table] = relationship("Table", back_populates="orders")
    waiter: Mapped[User] = relationship("User", back_populates="orders", foreign_keys=[waiter_id])
    items: Mapped[List[OrderItem]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    bill: Mapped[Optional[Bill]] = relationship("Bill", back_populates="order", uselist=False)
    audit_logs: Mapped[List[OrderAuditLog]] = relationship("OrderAuditLog", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("orders.id"))
    menu_item_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("menu_items.id"))
    variant_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("menu_item_variants.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2))   # price snapshot at order time
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_served: Mapped[bool] = mapped_column(Boolean, default=False)
    is_voided: Mapped[bool] = mapped_column(Boolean, default=False)
    void_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    voided_by: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    order: Mapped[Order] = relationship("Order", back_populates="items")
    menu_item: Mapped[MenuItem] = relationship("MenuItem", back_populates="order_items")
    variant: Mapped[Optional[MenuItemVariant]] = relationship("MenuItemVariant", back_populates="order_items")
    voided_by_user: Mapped[Optional[User]] = relationship("User", back_populates="voided_items", foreign_keys=[voided_by])
