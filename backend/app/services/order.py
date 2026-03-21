from __future__ import annotations

import uuid
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.audit import OrderAuditLog
from app.models.enums import AuditAction, OrderStatus, TableStatus, UserRole
from app.models.menu import MenuItem, MenuItemVariant
from app.models.order import Order, OrderItem
from app.models.table import Table
from app.schemas.order import AddItemsRequest, OrderCreate, OrderItemCreate, VoidItemRequest


# ── Internal helpers ──────────────────────────────────────────────────────────

def _resolve_unit_price(
    item: MenuItem,
    variant: Optional[MenuItemVariant],
    unit_price: Optional[float],
) -> float:
    """
    Price resolution order:
    1. Market-price items (seafood) → caller must provide unit_price
    2. Variant selected → use variant.price
    3. Item has a default variant → use its price
    4. Otherwise → error (item is misconfigured)
    """
    if item.is_market_price:
        if unit_price is None:
            raise HTTPException(400, f"'{item.name}' is a market-price item — price must be provided")
        return unit_price

    if variant:
        return float(variant.price)

    default = next((v for v in item.variants if v.is_default), None)
    if default:
        return float(default.price)

    raise HTTPException(400, f"'{item.name}' has no price configured. Add variants or mark as market price.")


def _build_order_item(db: Session, order_id: uuid.UUID, data: OrderItemCreate) -> OrderItem:
    item = db.get(MenuItem, data.menu_item_id)
    if not item:
        raise HTTPException(404, f"Menu item {data.menu_item_id} not found")
    if not item.is_available:
        raise HTTPException(400, f"'{item.name}' is currently unavailable")

    variant = None
    if data.variant_id:
        variant = db.get(MenuItemVariant, data.variant_id)
        if not variant or variant.menu_item_id != item.id:
            raise HTTPException(400, f"Variant does not belong to '{item.name}'")

    unit_price = _resolve_unit_price(item, variant, data.unit_price)

    return OrderItem(
        order_id=order_id,
        menu_item_id=item.id,
        variant_id=variant.id if variant else None,
        quantity=data.quantity,
        unit_price=unit_price,
        notes=data.notes,
    )


# ── Order operations ──────────────────────────────────────────────────────────

def create_order(db: Session, data: OrderCreate, waiter_id: uuid.UUID) -> Order:
    table = db.get(Table, data.table_id)
    if not table:
        raise HTTPException(404, "Table not found")
    if table.status == TableStatus.bill_requested:
        raise HTTPException(400, "Table has a pending bill — settle it before placing a new order")

    order = Order(table_id=data.table_id, waiter_id=waiter_id, order_source=data.order_source)
    db.add(order)
    db.flush()

    for item_data in data.items:
        order_item = _build_order_item(db, order.id, item_data)
        db.add(order_item)
        db.flush()
        db.add(OrderAuditLog(
            order_id=order.id,
            order_item_id=order_item.id,
            action=AuditAction.add,
            performed_by=waiter_id,
        ))

    table.status = TableStatus.occupied
    db.commit()
    db.refresh(order)
    return order


def get_order(db: Session, order_id: uuid.UUID) -> Order:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    return order


def get_active_order_for_table(db: Session, table_id: uuid.UUID) -> Optional[Order]:
    return (
        db.query(Order)
        .filter(Order.table_id == table_id, Order.status == OrderStatus.open)
        .first()
    )


def add_items(db: Session, order_id: uuid.UUID, data: AddItemsRequest, waiter_id: uuid.UUID) -> Order:
    order = get_order(db, order_id)
    if order.status != OrderStatus.open:
        raise HTTPException(400, "Cannot add items to a closed or billed order")

    for item_data in data.items:
        order_item = _build_order_item(db, order.id, item_data)
        db.add(order_item)
        db.flush()
        db.add(OrderAuditLog(
            order_id=order.id,
            order_item_id=order_item.id,
            action=AuditAction.add,
            performed_by=waiter_id,
        ))

    db.commit()
    db.refresh(order)
    return order


def mark_item_served(db: Session, order_item_id: uuid.UUID) -> OrderItem:
    order_item = db.get(OrderItem, order_item_id)
    if not order_item:
        raise HTTPException(404, "Order item not found")
    if order_item.is_voided:
        raise HTTPException(400, "Cannot mark a voided item as served")
    order_item.is_served = True
    db.commit()
    db.refresh(order_item)
    return order_item


def void_item(db: Session, order_item_id: uuid.UUID, data: VoidItemRequest, performed_by_user) -> OrderItem:
    order_item = db.get(OrderItem, order_item_id)
    if not order_item:
        raise HTTPException(404, "Order item not found")
    if order_item.is_voided:
        raise HTTPException(400, "Item is already voided")
    # Served items require manager/admin override
    if order_item.is_served and performed_by_user.role not in (UserRole.admin, UserRole.manager):
        raise HTTPException(403, "Manager approval required to void a served item")

    order_item.is_voided = True
    order_item.void_reason = data.void_reason
    order_item.voided_by = performed_by_user.id
    db.add(OrderAuditLog(
        order_id=order_item.order_id,
        order_item_id=order_item.id,
        action=AuditAction.void,
        performed_by=performed_by_user.id,
        reason=data.void_reason,
    ))
    db.commit()
    db.refresh(order_item)
    return order_item


def request_bill(db: Session, order_id: uuid.UUID) -> Order:
    order = get_order(db, order_id)
    if order.status != OrderStatus.open:
        raise HTTPException(400, "Order is not open")
    table = db.get(Table, order.table_id)
    table.status = TableStatus.bill_requested
    db.commit()
    db.refresh(order)
    return order


def cancel_order(db: Session, order_id: uuid.UUID, reason: str, performed_by: uuid.UUID) -> Order:
    order = get_order(db, order_id)
    if order.status != OrderStatus.open:
        raise HTTPException(400, "Only open orders can be cancelled")
    order.status = OrderStatus.cancelled
    table = db.get(Table, order.table_id)
    table.status = TableStatus.available
    db.add(OrderAuditLog(
        order_id=order.id,
        action=AuditAction.cancel,
        performed_by=performed_by,
        reason=reason,
    ))
    db.commit()
    db.refresh(order)
    return order
