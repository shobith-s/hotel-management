from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.menu import MenuCategory, MenuItem, MenuItemHistory, MenuItemVariant
from app.schemas.menu import (
    MenuCategoryCreate, MenuCategoryUpdate,
    MenuItemCreate, MenuItemUpdate,
    MenuItemVariantCreate, MenuItemVariantUpdate,
)


def _record_history(
    db: Session,
    item_id: uuid.UUID,
    changed_by_id: Optional[uuid.UUID],
    changes: dict,
    note: Optional[str] = None,
) -> None:
    """Record one history row per changed field."""
    for field, (old_val, new_val) in changes.items():
        db.add(MenuItemHistory(
            menu_item_id=item_id,
            changed_by_id=changed_by_id,
            field_name=field,
            old_value=str(old_val) if old_val is not None else None,
            new_value=str(new_val) if new_val is not None else None,
            note=note,
        ))


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


def update_menu_item(db: Session, item_id: uuid.UUID, data: MenuItemUpdate, changed_by_id: Optional[uuid.UUID] = None) -> MenuItem:
    item = get_menu_item(db, item_id)
    updates = data.model_dump(exclude_none=True)
    changes = {f: (getattr(item, f), v) for f, v in updates.items() if getattr(item, f) != v}
    for field, value in updates.items():
        setattr(item, field, value)
    if changes:
        _record_history(db, item_id, changed_by_id, changes)
    db.commit()
    db.refresh(item)
    return item


def toggle_availability(db: Session, item_id: uuid.UUID, changed_by_id: Optional[uuid.UUID] = None) -> MenuItem:
    item = get_menu_item(db, item_id)
    old_val = item.is_available
    item.is_available = not item.is_available
    _record_history(db, item_id, changed_by_id, {"is_available": (old_val, item.is_available)})
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


def update_variant(db: Session, variant_id: uuid.UUID, data: MenuItemVariantUpdate, changed_by_id: Optional[uuid.UUID] = None) -> MenuItemVariant:
    variant = db.get(MenuItemVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    updates = data.model_dump(exclude_none=True)
    changes = {f: (getattr(variant, f), v) for f, v in updates.items() if getattr(variant, f) != v}
    for field, value in updates.items():
        setattr(variant, field, value)
    if changes:
        _record_history(db, variant.menu_item_id, changed_by_id, changes, note=f"Variant: {variant.label}")
    db.commit()
    db.refresh(variant)
    return variant


def get_item_history(db: Session, item_id: uuid.UUID) -> list:
    get_menu_item(db, item_id)
    return (
        db.query(MenuItemHistory)
        .filter(MenuItemHistory.menu_item_id == item_id)
        .order_by(MenuItemHistory.changed_at.desc())
        .limit(100)
        .all()
    )


def delete_variant(db: Session, variant_id: uuid.UUID) -> None:
    variant = db.get(MenuItemVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    db.delete(variant)
    db.commit()
