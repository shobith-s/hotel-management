from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .order import OrderItem


class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    display_order: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    items: Mapped[List[MenuItem]] = relationship("MenuItem", back_populates="category")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("menu_categories.id"))
    name: Mapped[str] = mapped_column(String(150))
    gst_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=5.0)
    is_veg: Mapped[bool] = mapped_column(Boolean, default=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    is_market_price: Mapped[bool] = mapped_column(Boolean, default=False)  # e.g. seafood — price set at order time
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    category: Mapped[MenuCategory] = relationship("MenuCategory", back_populates="items")
    variants: Mapped[List[MenuItemVariant]] = relationship("MenuItemVariant", back_populates="menu_item", cascade="all, delete-orphan")
    order_items: Mapped[List[OrderItem]] = relationship("OrderItem", back_populates="menu_item")
    history: Mapped[List[MenuItemHistory]] = relationship("MenuItemHistory", back_populates="menu_item", cascade="all, delete-orphan", order_by="MenuItemHistory.changed_at.desc()")


class MenuItemVariant(Base):
    __tablename__ = "menu_item_variants"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    menu_item_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("menu_items.id"))
    label: Mapped[str] = mapped_column(String(50))       # "Half", "Full", "Per Kg"
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    menu_item: Mapped[MenuItem] = relationship("MenuItem", back_populates="variants")
    order_items: Mapped[List[OrderItem]] = relationship("OrderItem", back_populates="variant")


class MenuItemHistory(Base):
    __tablename__ = "menu_item_history"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    menu_item_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("menu_items.id", ondelete="CASCADE"))
    changed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    field_name: Mapped[str] = mapped_column(String(50))   # e.g. "price", "is_available", "name"
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # e.g. "Variant: Half"

    menu_item: Mapped[MenuItem] = relationship("MenuItem", back_populates="history")
    changed_by: Mapped[Optional[object]] = relationship("User", foreign_keys=[changed_by_id])
