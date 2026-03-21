import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.enums import UserRole
from app.schemas.menu import (
    MenuCategoryCreate, MenuCategoryRead, MenuCategoryUpdate, MenuCategoryWithItems,
    MenuItemCreate, MenuItemRead, MenuItemUpdate,
    MenuItemVariantCreate, MenuItemVariantRead, MenuItemVariantUpdate,
)
from app.services import menu as menu_svc

router = APIRouter(prefix="/menu", tags=["Menu"])

_admin_manager = Depends(require_roles(UserRole.admin, UserRole.manager))


# ── Full menu (all categories with items) — all authenticated staff ───────────

@router.get("/", response_model=List[MenuCategoryWithItems])
def get_full_menu(
    available_only: bool = True,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    categories = menu_svc.list_categories(db, active_only=True)
    result = []
    for cat in categories:
        items = menu_svc.list_menu_items(db, category_id=cat.id, available_only=available_only)
        cat_dict = MenuCategoryWithItems.model_validate(cat)
        cat_dict.items = [MenuItemRead.model_validate(i) for i in items]
        result.append(cat_dict)
    return result


# ── Categories ────────────────────────────────────────────────────────────────

@router.post("/categories", response_model=MenuCategoryRead, dependencies=[_admin_manager])
def create_category(data: MenuCategoryCreate, db: Session = Depends(get_db)):
    return menu_svc.create_category(db, data)


@router.get("/categories", response_model=List[MenuCategoryRead])
def list_categories(
    active_only: bool = True,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return menu_svc.list_categories(db, active_only)


@router.patch("/categories/{cat_id}", response_model=MenuCategoryRead, dependencies=[_admin_manager])
def update_category(cat_id: uuid.UUID, data: MenuCategoryUpdate, db: Session = Depends(get_db)):
    return menu_svc.update_category(db, cat_id, data)


# ── Menu Items ────────────────────────────────────────────────────────────────

@router.post("/items", response_model=MenuItemRead, dependencies=[_admin_manager])
def create_item(data: MenuItemCreate, db: Session = Depends(get_db)):
    return menu_svc.create_menu_item(db, data)


@router.get("/items", response_model=List[MenuItemRead])
def list_items(
    category_id: Optional[uuid.UUID] = None,
    available_only: bool = False,
    is_veg: Optional[bool] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return menu_svc.list_menu_items(db, category_id, available_only, is_veg)


@router.get("/items/{item_id}", response_model=MenuItemRead)
def get_item(item_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return menu_svc.get_menu_item(db, item_id)


@router.patch("/items/{item_id}", response_model=MenuItemRead, dependencies=[_admin_manager])
def update_item(item_id: uuid.UUID, data: MenuItemUpdate, db: Session = Depends(get_db)):
    return menu_svc.update_menu_item(db, item_id, data)


@router.post("/items/{item_id}/toggle", response_model=MenuItemRead, dependencies=[_admin_manager])
def toggle_availability(item_id: uuid.UUID, db: Session = Depends(get_db)):
    return menu_svc.toggle_availability(db, item_id)


# ── Variants ──────────────────────────────────────────────────────────────────

@router.post("/items/{item_id}/variants", response_model=MenuItemVariantRead, dependencies=[_admin_manager])
def add_variant(item_id: uuid.UUID, data: MenuItemVariantCreate, db: Session = Depends(get_db)):
    return menu_svc.add_variant(db, item_id, data)


@router.patch("/variants/{variant_id}", response_model=MenuItemVariantRead, dependencies=[_admin_manager])
def update_variant(variant_id: uuid.UUID, data: MenuItemVariantUpdate, db: Session = Depends(get_db)):
    return menu_svc.update_variant(db, variant_id, data)


@router.delete("/variants/{variant_id}", status_code=204, dependencies=[_admin_manager])
def delete_variant(variant_id: uuid.UUID, db: Session = Depends(get_db)):
    menu_svc.delete_variant(db, variant_id)
