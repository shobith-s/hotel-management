from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import OrderSource, OrderStatus
from app.schemas.menu import MenuItemRead, MenuItemVariantRead


class OrderItemCreate(BaseModel):
    menu_item_id: uuid.UUID
    variant_id: Optional[uuid.UUID] = None      # required when item has variants
    quantity: int = 1
    notes: Optional[str] = None
    unit_price: Optional[float] = None          # required only for is_market_price items (seafood)

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    notes: Optional[str] = None
    is_served: Optional[bool] = None


class VoidItemRequest(BaseModel):
    void_reason: str


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    menu_item_id: uuid.UUID
    variant_id: Optional[uuid.UUID]
    quantity: int
    unit_price: float
    notes: Optional[str]
    is_served: bool
    is_voided: bool
    void_reason: Optional[str]
    voided_by: Optional[uuid.UUID]
    created_at: datetime
    menu_item: MenuItemRead
    variant: Optional[MenuItemVariantRead]


# ── Orders ────────────────────────────────────────────────────────────────────

class OrderCreate(BaseModel):
    table_id: uuid.UUID
    items: List[OrderItemCreate]
    order_source: OrderSource = OrderSource.manual


class AddItemsRequest(BaseModel):
    items: List[OrderItemCreate]


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    table_id: uuid.UUID
    waiter_id: uuid.UUID
    status: OrderStatus
    order_source: OrderSource
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemRead] = []
