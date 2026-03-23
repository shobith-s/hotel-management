import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.enums import OrderStatus, UserRole
from app.models.order import Order
from app.schemas.audit import OrderAuditLogRead
from app.schemas.order import (
    AddItemsRequest, OrderCreate, OrderItemRead, OrderItemUpdate, OrderRead, VoidItemRequest,
)
from app.services import order as order_svc

router = APIRouter(prefix="/orders", tags=["Orders"])

_all_staff = Depends(get_current_user)
_admin_manager = Depends(require_roles(UserRole.admin, UserRole.manager))


class CancelRequest(BaseModel):
    reason: str


# ── Order CRUD ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[OrderRead], dependencies=[_all_staff])
def list_orders(
    status: Optional[OrderStatus] = Query(None),
    has_unserved: Optional[bool] = Query(None, description="If true, only return orders with at least one unserved, unvoided item"),
    db: Session = Depends(get_db),
):
    from app.models.order import OrderItem
    q = db.query(Order)
    if status:
        q = q.filter(Order.status == status)
    if has_unserved:
        q = q.filter(
            Order.items.any(
                (OrderItem.is_served == False) & (OrderItem.is_voided == False)  # noqa: E712
            )
        )
    return q.order_by(Order.created_at.asc()).all()


@router.post("/", response_model=OrderRead)
def create_order(data: OrderCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return order_svc.create_order(db, data, current_user.id)


@router.get("/table/{table_id}/active", response_model=OrderRead)
def active_order_for_table(table_id: uuid.UUID, db: Session = Depends(get_db), _=_all_staff):
    from fastapi import HTTPException
    order = order_svc.get_active_order_for_table(db, table_id)
    if not order:
        raise HTTPException(404, "No active order for this table")
    return order


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: uuid.UUID, db: Session = Depends(get_db), _=_all_staff):
    return order_svc.get_order(db, order_id)


# ── Item operations ───────────────────────────────────────────────────────────

@router.post("/{order_id}/items", response_model=OrderRead)
def add_items(
    order_id: uuid.UUID,
    data: AddItemsRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return order_svc.add_items(db, order_id, data, current_user.id)


@router.patch("/{order_id}/items/{item_id}/served", response_model=OrderItemRead)
def mark_served(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=_all_staff,
):
    return order_svc.mark_item_served(db, item_id)


@router.post("/{order_id}/items/{item_id}/void", response_model=OrderItemRead)
def void_item(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    data: VoidItemRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return order_svc.void_item(db, item_id, data, current_user)


# ── Order lifecycle ───────────────────────────────────────────────────────────

@router.post("/{order_id}/request-bill", response_model=OrderRead)
def request_bill(order_id: uuid.UUID, db: Session = Depends(get_db), _=_all_staff):
    return order_svc.request_bill(db, order_id)


@router.post("/{order_id}/cancel", response_model=OrderRead, dependencies=[_admin_manager])
def cancel_order(
    order_id: uuid.UUID,
    data: CancelRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return order_svc.cancel_order(db, order_id, data.reason, current_user.id)


# ── Audit log ─────────────────────────────────────────────────────────────────

@router.get("/{order_id}/audit", response_model=List[OrderAuditLogRead], dependencies=[_admin_manager])
def get_audit_log(order_id: uuid.UUID, db: Session = Depends(get_db)):
    from app.models.audit import OrderAuditLog
    return db.query(OrderAuditLog).filter(OrderAuditLog.order_id == order_id).all()
