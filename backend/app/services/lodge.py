from __future__ import annotations

import math
import uuid
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.enums import BookingStatus, ChargeType, HousekeepingStatus, RoomStatus
from app.models.lodge import Booking, BookingCharge, Guest, Room, RoomType
from app.schemas.lodge import (
    BookingChargeCreate, BookingCreate, CheckOutRequest,
    GuestCreate, RoomCreate, RoomTypeCreate, RoomTypeUpdate, RoomUpdate,
)


# ── Room Types ────────────────────────────────────────────────────────────────

def create_room_type(db: Session, data: RoomTypeCreate) -> RoomType:
    rt = RoomType(**data.model_dump())
    db.add(rt)
    db.commit()
    db.refresh(rt)
    return rt


def get_room_type(db: Session, rt_id: uuid.UUID) -> RoomType:
    rt = db.get(RoomType, rt_id)
    if not rt:
        raise HTTPException(404, "Room type not found")
    return rt


def list_room_types(db: Session) -> List[RoomType]:
    return db.query(RoomType).all()


def update_room_type(db: Session, rt_id: uuid.UUID, data: RoomTypeUpdate) -> RoomType:
    rt = get_room_type(db, rt_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(rt, field, value)
    db.commit()
    db.refresh(rt)
    return rt


# ── Rooms ─────────────────────────────────────────────────────────────────────

def create_room(db: Session, data: RoomCreate) -> Room:
    get_room_type(db, data.room_type_id)
    room = Room(**data.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def get_room(db: Session, room_id: uuid.UUID) -> Room:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    return room


def list_rooms(
    db: Session,
    status: Optional[RoomStatus] = None,
    room_type_id: Optional[uuid.UUID] = None,
    floor: Optional[int] = None,
) -> List[Room]:
    q = db.query(Room)
    if status:
        q = q.filter(Room.status == status)
    if room_type_id:
        q = q.filter(Room.room_type_id == room_type_id)
    if floor is not None:
        q = q.filter(Room.floor == floor)
    return q.all()


def update_room(db: Session, room_id: uuid.UUID, data: RoomUpdate) -> Room:
    room = get_room(db, room_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(room, field, value)
    db.commit()
    db.refresh(room)
    return room


# ── Guests ────────────────────────────────────────────────────────────────────

def create_guest(db: Session, data: GuestCreate) -> Guest:
    guest = Guest(**data.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


def get_guest(db: Session, guest_id: uuid.UUID) -> Guest:
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(404, "Guest not found")
    return guest


def search_guests(db: Session, phone: str) -> List[Guest]:
    return db.query(Guest).filter(Guest.phone.contains(phone)).all()


# ── Bookings ──────────────────────────────────────────────────────────────────

def check_in(db: Session, data: BookingCreate, checked_in_by: uuid.UUID) -> Booking:
    room = get_room(db, data.room_id)
    if room.status != RoomStatus.available:
        raise HTTPException(400, f"Room {room.room_number} is not available (status: {room.status.value})")
    get_guest(db, data.guest_id)

    # Resolve nightly rate: find matching room type for AC/Non-AC preference
    from app.models.lodge import RoomType
    target_type_name = "AC Room" if data.ac_used else "Non-AC Room"
    rate_type = db.query(RoomType).filter(RoomType.name == target_type_name).first()
    nightly_rate = rate_type.base_rate if rate_type else room.room_type.base_rate

    payload = data.model_dump()
    payload["nightly_rate"] = nightly_rate
    booking = Booking(checked_in_by=checked_in_by, **payload)
    db.add(booking)
    db.flush()

    # Record advance payment as a credit charge
    if data.advance_paid > 0:
        db.add(BookingCharge(
            booking_id=booking.id,
            charge_type=ChargeType.extra,
            description="Advance payment collected at check-in",
            amount=-data.advance_paid,      # negative = credit
        ))

    room.status = RoomStatus.occupied
    db.commit()
    db.refresh(booking)
    return booking


def get_booking(db: Session, booking_id: uuid.UUID) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    return booking


def list_active_bookings(db: Session) -> List[Booking]:
    return db.query(Booking).filter(Booking.status == BookingStatus.active).all()


def add_booking_charge(db: Session, booking_id: uuid.UUID, data: BookingChargeCreate) -> BookingCharge:
    get_booking(db, booking_id)
    charge = BookingCharge(booking_id=booking_id, **data.model_dump())
    db.add(charge)
    db.commit()
    db.refresh(charge)
    return charge


def _calculate_nights(check_in: datetime, check_out: datetime) -> int:
    """Standard hotel night calculation — rounds up, minimum 1 night."""
    delta = check_out - check_in
    return max(math.ceil(delta.total_seconds() / 86400), 1)


def check_out(db: Session, booking_id: uuid.UUID, data: CheckOutRequest) -> dict:
    booking = get_booking(db, booking_id)
    if booking.status != BookingStatus.active:
        raise HTTPException(400, "Booking is not active")

    check_out_at = data.check_out_at or datetime.utcnow()
    nights = _calculate_nights(booking.check_in_at, check_out_at)
    room_type = booking.room.room_type
    rate = booking.nightly_rate if booking.nightly_rate else room_type.base_rate
    ac_label = "AC" if booking.ac_used else "Non-AC"

    room_charge = Decimal(str(rate)) * nights
    gst_amount = (room_charge * Decimal(str(room_type.gst_rate)) / 100).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    room_charge_entry = BookingCharge(
        booking_id=booking.id,
        charge_type=ChargeType.room,
        description=f"Room {booking.room.room_number} ({ac_label}) — {nights} night(s) @ ₹{rate}/night",
        amount=float(room_charge),
    )
    db.add(room_charge_entry)
    db.flush()

    all_charges = booking.charges + [room_charge_entry]
    total_charges = sum(Decimal(str(c.amount)) for c in all_charges)
    grand_total = total_charges + gst_amount

    booking.check_out_at = check_out_at
    booking.status = BookingStatus.checked_out
    booking.payment_mode = data.payment_mode
    booking.room.status = RoomStatus.available
    booking.room.housekeeping = HousekeepingStatus.dirty   # triggers housekeeping workflow

    db.commit()
    db.refresh(booking)
    return {
        "booking": booking,
        "nights": nights,
        "room_charge": float(room_charge),
        "nightly_rate": float(rate),
        "ac_used": booking.ac_used,
        "gst_rate": room_type.gst_rate,
        "gst_amount": float(gst_amount),
        "other_charges": float(total_charges - room_charge),
        "grand_total": float(grand_total),
        "payment_mode": data.payment_mode,
    }
