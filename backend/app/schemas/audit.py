from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import AuditAction


class OrderAuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    order_item_id: Optional[uuid.UUID]
    action: AuditAction
    performed_by: uuid.UUID
    reason: Optional[str]
    created_at: datetime
