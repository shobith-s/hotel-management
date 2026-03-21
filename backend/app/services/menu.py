from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.menu import MenuCategory, MenuItem, MenuItemVariant
from app.schemas.menu import (
    MenuCategoryCreate, MenuCategoryUpdate,
    MenuItemCreate, MenuItemUpdate,
    MenuItemVariantCreate, MenuItemVariantUpdate,
)


# ── Categories ────────────────────────────────────────────────────────────────

def create_category(db: Session, data: MenuCategoryCreate) -> MenuCategory:
    cat = MenuCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def get_category(db: Session, cat_id: uuid.UUID) -> MenuCategory:
    cat = db.get(MenuCategory, cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


def list_categories(db: Session, active_only: bool = True) -> List[MenuCategory]:
    q = db.query(MenuCategory)
    if active_only:
        q = q.filter(MenuCategory.is_active.is_(True))
    return q.order_by(MenuCategory.display_order).all()


def update_category(db: Session, cat_id: uuid.UUID, data: MenuCategoryUpdate) -> MenuCategory:
    cat = get_category(db, cat_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


# ── Menu Items ────────────────────────────────────────────────────────────────

def create_menu_item(db: Session, data: MenuItemCreate) -> MenuItem:
    get_category(db, data.category_id)   # validate category exists
    variants_data = data.variants
    item = MenuItem(**data.model_dump(exclude={"variants"}))
    db.add(item)
    db.flush()                            # get item.id before creating variants
    for v in variants_data:
        db.add(MenuItemVariant(menu_item_id=item.id, **v.model_dump()))
    db.commit()
    db.refresh(item)
    return item


def get_menu_item(db: Session, item_id: uuid.UUID) -> MenuItem:
    item = db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


def list_menu_items(
    db: Session,
    category_id: Optional[uuid.UUID] = None,
    available_only: bool = False,
    is_veg: Optional[bool] = None,
) -> List[MenuItem]:
    q = db.query(MenuItem)
    if category_id:
        q = q.filter(MenuItem.category_id == category_id)
    if available_only:
        q = q.filter(MenuItem.is_available.is_(True))
    if is_veg is not None:
        q = q.filter(MenuItem.is_veg.is_(is_veg))
    return q.all()


def update_menu_item(db: Session, item_id: uuid.UUID, data: MenuItemUpdate) -> MenuItem:
    item = get_menu_item(db, item_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def toggle_availability(db: Session, item_id: uuid.UUID) -> MenuItem:
    item = get_menu_item(db, item_id)
    item.is_available = not item.is_available
    db.commit()
    db.refresh(item)
    return item


# ── Variants ──────────────────────────────────────────────────────────────────

def add_variant(db: Session, item_id: uuid.UUID, data: MenuItemVariantCreate) -> MenuItemVariant:
    get_menu_item(db, item_id)
    variant = MenuItemVariant(menu_item_id=item_id, **data.model_dump())
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


def update_variant(db: Session, variant_id: uuid.UUID, data: MenuItemVariantUpdate) -> MenuItemVariant:
    variant = db.get(MenuItemVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(variant, field, value)
    db.commit()
    db.refresh(variant)
    return variant


def delete_variant(db: Session, variant_id: uuid.UUID) -> None:
    variant = db.get(MenuItemVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    db.delete(variant)
    db.commit()
