import csv
import io
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
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


# ── CSV Import ────────────────────────────────────────────────────────────────
# Expected CSV columns (header row required):
#   category_name, item_name, is_veg, price, gst_rate
# Optional columns:
#   is_market_price   (true/false, default false)
#   variant_label     (if item has a single named variant, e.g. "Full")
#
# For multi-variant items add multiple rows with the same item_name:
#   Starters,Chicken Tikka,false,180,5,,Half
#   Starters,Chicken Tikka,false,320,5,,Full

class CsvImportResult(BaseModel):
    imported: int
    skipped: int
    errors: List[str]


@router.post("/import-csv", response_model=CsvImportResult, dependencies=[_admin_manager])
def import_menu_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only .csv files are accepted")

    content = file.file.read().decode("utf-8-sig")  # utf-8-sig handles Excel BOM
    reader = csv.DictReader(io.StringIO(content))

    required = {"category_name", "item_name", "is_veg", "price", "gst_rate"}
    if not reader.fieldnames or not required.issubset({f.strip().lower() for f in reader.fieldnames}):
        raise HTTPException(400, f"CSV must have columns: {', '.join(sorted(required))}")

    # Normalise header names (strip whitespace, lowercase)
    def row_get(row: dict, key: str) -> str:
        for k, v in row.items():
            if k.strip().lower() == key:
                return (v or "").strip()
        return ""

    from app.models.menu import MenuCategory, MenuItem, MenuItemVariant

    imported = 0
    skipped  = 0
    errors: list[str] = []
    cat_cache: dict[str, MenuCategory] = {}

    for line_num, row in enumerate(reader, start=2):
        try:
            cat_name  = row_get(row, "category_name")
            item_name = row_get(row, "item_name")
            is_veg_s  = row_get(row, "is_veg").lower()
            price_s   = row_get(row, "price")
            gst_s     = row_get(row, "gst_rate")
            variant_label = row_get(row, "variant_label") or None
            is_market = row_get(row, "is_market_price").lower() in ("true", "1", "yes")

            if not cat_name or not item_name:
                errors.append(f"Row {line_num}: category_name and item_name are required")
                skipped += 1
                continue

            is_veg = is_veg_s in ("true", "1", "yes")
            price  = float(price_s) if price_s else 0.0
            gst    = int(float(gst_s)) if gst_s else 5

            if gst not in (0, 5, 12, 18):
                errors.append(f"Row {line_num}: gst_rate must be 0, 5, 12, or 18 — got {gst}")
                skipped += 1
                continue

            # Get or create category
            if cat_name not in cat_cache:
                cat = db.query(MenuCategory).filter(MenuCategory.name == cat_name).first()
                if not cat:
                    cat = MenuCategory(name=cat_name, display_order=999)
                    db.add(cat)
                    db.flush()
                cat_cache[cat_name] = cat
            cat = cat_cache[cat_name]

            # Check if item already exists in this category
            existing = (
                db.query(MenuItem)
                .filter(MenuItem.category_id == cat.id, MenuItem.name == item_name)
                .first()
            )

            if existing:
                # Item exists — add variant if new label provided
                if variant_label:
                    already_has = db.query(MenuItemVariant).filter(
                        MenuItemVariant.menu_item_id == existing.id,
                        MenuItemVariant.label == variant_label,
                    ).first()
                    if not already_has:
                        db.add(MenuItemVariant(
                            menu_item_id=existing.id,
                            label=variant_label,
                            price=price,
                            is_default=False,
                        ))
                        imported += 1
                    else:
                        skipped += 1
                else:
                    skipped += 1
                continue

            # Create new item
            item = MenuItem(
                category_id=cat.id,
                name=item_name,
                is_veg=is_veg,
                gst_rate=gst,
                is_market_price=is_market,
                is_available=True,
            )
            db.add(item)
            db.flush()

            # Add variant
            db.add(MenuItemVariant(
                menu_item_id=item.id,
                label=variant_label or "Regular",
                price=price,
                is_default=True,
            ))
            imported += 1

        except (ValueError, KeyError) as exc:
            errors.append(f"Row {line_num}: {exc}")
            skipped += 1

    db.commit()
    return CsvImportResult(imported=imported, skipped=skipped, errors=errors[:20])
