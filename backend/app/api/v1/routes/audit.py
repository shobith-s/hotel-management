from __future__ import annotations

import uuid
from datetime import date, datetime, time
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import require_roles
from app.models.audit import OrderAuditLog
from app.models.enums import AuditAction, UserRole
from app.models.order import OrderItem

router = APIRouter(prefix="/audit", tags=["Audit"])

_admin_manager = Depends(require_roles(UserRole.admin, UserRole.manager))


class AuditLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=False)

    id: uuid.UUID
    action: AuditAction
    reason: Optional[str]
    created_at: datetime
    performed_by_name: str
    table_number: str
    item_name: Optional[str]


@router.get("/", response_model=List[AuditLogEntry], dependencies=[_admin_manager])
def list_audit_logs(
    start: Optional[date] = Query(None),
    end: Optional[date] = Query(None),
    action: Optional[AuditAction] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(OrderAuditLog)
        .options(
            joinedload(OrderAuditLog.order).joinedload("table"),
            joinedload(OrderAuditLog.performed_by_user),
        )
    )

    if start:
        q = q.filter(OrderAuditLog.created_at >= datetime.combine(start, time.min))
    if end:
        q = q.filter(OrderAuditLog.created_at <= datetime.combine(end, time.max))
    if action:
        q = q.filter(OrderAuditLog.action == action)

    logs = q.order_by(OrderAuditLog.created_at.desc()).limit(500).all()

    # Collect order_item_ids to fetch in one query
    item_ids = [log.order_item_id for log in logs if log.order_item_id]
    items_by_id: dict = {}
    if item_ids:
        items = (
            db.query(OrderItem)
            .options(joinedload(OrderItem.menu_item))
            .filter(OrderItem.id.in_(item_ids))
            .all()
        )
        items_by_id = {item.id: item for item in items}

    result = []
    for log in logs:
        item_name = None
        if log.order_item_id and log.order_item_id in items_by_id:
            oi = items_by_id[log.order_item_id]
            item_name = oi.menu_item.name if oi.menu_item else None

        result.append(AuditLogEntry(
            id=log.id,
            action=log.action,
            reason=log.reason,
            created_at=log.created_at,
            performed_by_name=log.performed_by_user.name if log.performed_by_user else "Unknown",
            table_number=log.order.table.table_number if log.order and log.order.table else "—",
            item_name=item_name,
        ))

    return result
