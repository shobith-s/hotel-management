from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import UserRole


class MenuItemVariantCreate(BaseModel):
    label: str                  # "Half", "Full", "Per Kg"
    price: float
    is_default: bool = False

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Price cannot be negative")
        return v


class MenuItemVariantUpdate(BaseModel):
    label: Optional[str] = None
    price: Optional[float] = None
    is_default: Optional[bool] = None


class MenuItemVariantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    menu_item_id: uuid.UUID
    label: str
    price: float
    is_default: bool


# ── Menu Items ────────────────────────────────────────────────────────────────

class MenuItemCreate(BaseModel):
    category_id: uuid.UUID
    name: str
    gst_rate: float = 5.0           # 5 / 12 / 18
    is_veg: bool = True
    is_available: bool = True
    is_market_price: bool = False   # True for seafood — price entered at order time
    description: Optional[str] = None
    variants: List[MenuItemVariantCreate] = []

    @field_validator("gst_rate")
    @classmethod
    def valid_gst_rate(cls, v: float) -> float:
        if v not in (0, 5.0, 12.0, 18.0):
            raise ValueError("GST rate must be 0, 5, 12, or 18")
        return v


class MenuItemUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    name: Optional[str] = None
    gst_rate: Optional[float] = None
    is_veg: Optional[bool] = None
    is_available: Optional[bool] = None
    is_market_price: Optional[bool] = None
    description: Optional[str] = None


class MenuItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: uuid.UUID
    name: str
    gst_rate: float
    is_veg: bool
    is_available: bool
    is_market_price: bool
    description: Optional[str]
    variants: List[MenuItemVariantRead]
    created_at: datetime
    updated_at: datetime


# ── Menu Item History ─────────────────────────────────────────────────────────

class MenuItemHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    menu_item_id: uuid.UUID
    changed_by_id: Optional[uuid.UUID]
    changed_at: datetime
    field_name: str
    old_value: Optional[str]
    new_value: Optional[str]
    note: Optional[str]


# ── Menu Categories ───────────────────────────────────────────────────────────

class MenuCategoryCreate(BaseModel):
    name: str
    display_order: int = 0


class MenuCategoryUpdate(BaseModel):
    name: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class MenuCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    display_order: int
    is_active: bool


class MenuCategoryWithItems(MenuCategoryRead):
    items: List[MenuItemRead] = []
