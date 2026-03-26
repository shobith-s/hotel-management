from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import PaymentMode, PaymentStatus


class BillCreate(BaseModel):
    order_id: uuid.UUID
    discount_amount: float = 0.0
    service_charge: float = 0.0
    is_igst: bool = False   # False = CGST+SGST (intrastate), True = IGST (interstate)


class PaymentRequest(BaseModel):
    payment_mode: PaymentMode


class ChargeToRoomRequest(BaseModel):
    booking_id: uuid.UUID


class BillRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    bill_number: str
    subtotal: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    service_charge: float
    discount_amount: float
    grand_total: float
    payment_mode: Optional[PaymentMode]
    payment_status: PaymentStatus
    served_by: uuid.UUID
    created_at: datetime
    paid_at: Optional[datetime]
