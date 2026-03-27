from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import BookingStatus, ChargeType, HousekeepingStatus, IDType, PaymentMode, RoomStatus


class RoomTypeCreate(BaseModel):
    name: str
    base_rate: float
    gst_rate: float     # 12.0 or 18.0

    @field_validator("gst_rate")
    @classmethod
    def valid_gst_rate(cls, v: float) -> float:
        if v not in (12.0, 18.0):
            raise ValueError("Accommodation GST rate must be 12 or 18")
        return v


class RoomTypeUpdate(BaseModel):
    name: Optional[str] = None
    base_rate: Optional[float] = None
    gst_rate: Optional[float] = None


class RoomTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    base_rate: float
    gst_rate: float


# ── Rooms ─────────────────────────────────────────────────────────────────────

class RoomCreate(BaseModel):
    room_type_id: uuid.UUID
    room_number: str
    floor: int = 1


class RoomUpdate(BaseModel):
    room_type_id: Optional[uuid.UUID] = None
    floor: Optional[int] = None
    status: Optional[RoomStatus] = None
    housekeeping: Optional[HousekeepingStatus] = None


class RoomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_type_id: uuid.UUID
    room_number: str
    floor: int
    status: RoomStatus
    housekeeping: HousekeepingStatus
    room_type: RoomTypeRead


# ── Guests ────────────────────────────────────────────────────────────────────

class GuestCreate(BaseModel):
    name: str
    phone: str
    id_type: IDType
    id_number: str
    address: Optional[str] = None


class GuestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str
    id_type: IDType
    id_number: str
    address: Optional[str]
    created_at: datetime


# ── Bookings ──────────────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    room_id: uuid.UUID
    guest_id: uuid.UUID
    check_in_at: datetime
    expected_check_out: datetime
    num_guests: int = 1
    advance_paid: float = 0.0
    ac_used: bool = True        # customer's AC preference — affects nightly rate


class CheckOutRequest(BaseModel):
    check_out_at: Optional[datetime] = None     # defaults to now() in service layer
    payment_mode: PaymentMode = PaymentMode.cash


class BookingChargeCreate(BaseModel):
    charge_type: ChargeType
    description: str
    amount: float
    order_id: Optional[uuid.UUID] = None        # link restaurant order to stay


class BookingChargeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_id: uuid.UUID
    charge_type: ChargeType
    description: str
    amount: float
    order_id: Optional[uuid.UUID]
    created_at: datetime


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_id: uuid.UUID
    guest_id: uuid.UUID
    checked_in_by: uuid.UUID
    check_in_at: datetime
    expected_check_out: datetime
    check_out_at: Optional[datetime]
    num_guests: int
    advance_paid: float
    ac_used: bool
    nightly_rate: float
    status: BookingStatus
    payment_mode: Optional[PaymentMode]
    created_at: datetime
    guest: GuestRead
    room: RoomRead
    charges: List[BookingChargeRead] = []


class CheckoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking: BookingRead
    nights: int
    room_charge: float
    nightly_rate: float
    ac_used: bool
    gst_rate: float
    gst_amount: float
    other_charges: float
    grand_total: float
    payment_mode: PaymentMode
