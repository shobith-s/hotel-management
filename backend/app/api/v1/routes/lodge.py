import uuid
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.ws_manager import hk_manager
from app.models.enums import HousekeepingStatus, RoomStatus, UserRole
from app.schemas.lodge import (
    BookingChargeCreate, BookingChargeRead, BookingCreate, BookingRead,
    CheckOutRequest, CheckoutResponse, GuestCreate, GuestRead,
    RoomCreate, RoomRead, RoomTypeCreate, RoomTypeRead, RoomTypeUpdate, RoomUpdate,
)
from app.services import lodge as lodge_svc

router = APIRouter(prefix="/lodge", tags=["Lodge"])

_all_staff = Depends(get_current_user)
_admin_only = Depends(require_roles(UserRole.admin))
_admin_manager = Depends(require_roles(UserRole.admin, UserRole.manager))
_front_desk = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.receptionist))


# ── Room Types ────────────────────────────────────────────────────────────────

@router.post("/room-types", response_model=RoomTypeRead, dependencies=[_admin_only])
def create_room_type(data: RoomTypeCreate, db: Session = Depends(get_db)):
    return lodge_svc.create_room_type(db, data)


@router.get("/room-types", response_model=List[RoomTypeRead], dependencies=[_all_staff])
def list_room_types(db: Session = Depends(get_db)):
    return lodge_svc.list_room_types(db)


@router.patch("/room-types/{rt_id}", response_model=RoomTypeRead, dependencies=[_admin_only])
def update_room_type(rt_id: uuid.UUID, data: RoomTypeUpdate, db: Session = Depends(get_db)):
    return lodge_svc.update_room_type(db, rt_id, data)


# ── Rooms ─────────────────────────────────────────────────────────────────────

@router.post("/rooms", response_model=RoomRead, dependencies=[_admin_only])
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
    return lodge_svc.create_room(db, data)


@router.get("/rooms", response_model=List[RoomRead], dependencies=[_all_staff])
def list_rooms(
    status: Optional[RoomStatus] = None,
    room_type_id: Optional[uuid.UUID] = None,
    floor: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return lodge_svc.list_rooms(db, status, room_type_id, floor)


@router.get("/rooms/{room_id}", response_model=RoomRead, dependencies=[_all_staff])
def get_room(room_id: uuid.UUID, db: Session = Depends(get_db)):
    return lodge_svc.get_room(db, room_id)


@router.patch("/rooms/{room_id}", response_model=RoomRead, dependencies=[_admin_manager])
def update_room(room_id: uuid.UUID, data: RoomUpdate, bg: BackgroundTasks, db: Session = Depends(get_db)):
    room = lodge_svc.update_room(db, room_id, data)
    if data.housekeeping is not None:
        bg.add_task(hk_manager.broadcast, {
            "type": "housekeeping_update",
            "room_id": str(room.id),
            "room_number": room.room_number,
            "housekeeping": data.housekeeping.value,
        })
    return room


# ── Guests ────────────────────────────────────────────────────────────────────

@router.post("/guests", response_model=GuestRead, dependencies=[_front_desk])
def create_guest(data: GuestCreate, db: Session = Depends(get_db)):
    return lodge_svc.create_guest(db, data)


@router.get("/guests/search", response_model=List[GuestRead], dependencies=[_front_desk])
def search_guests(phone: str, db: Session = Depends(get_db)):
    return lodge_svc.search_guests(db, phone)


@router.get("/guests/{guest_id}", response_model=GuestRead, dependencies=[_front_desk])
def get_guest(guest_id: uuid.UUID, db: Session = Depends(get_db)):
    return lodge_svc.get_guest(db, guest_id)


# ── Bookings ──────────────────────────────────────────────────────────────────

@router.post("/bookings", response_model=BookingRead, dependencies=[_front_desk])
def check_in(
    data: BookingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return lodge_svc.check_in(db, data, current_user.id)


@router.get("/bookings", response_model=List[BookingRead], dependencies=[_front_desk])
def list_active_bookings(db: Session = Depends(get_db)):
    return lodge_svc.list_active_bookings(db)


@router.get("/bookings/{booking_id}", response_model=BookingRead, dependencies=[_front_desk])
def get_booking(booking_id: uuid.UUID, db: Session = Depends(get_db)):
    return lodge_svc.get_booking(db, booking_id)


@router.post("/bookings/{booking_id}/charges", response_model=BookingChargeRead, dependencies=[_front_desk])
def add_charge(booking_id: uuid.UUID, data: BookingChargeCreate, db: Session = Depends(get_db)):
    return lodge_svc.add_booking_charge(db, booking_id, data)


@router.post("/bookings/{booking_id}/checkout", response_model=CheckoutResponse, dependencies=[_front_desk])
def check_out(
    booking_id: uuid.UUID,
    data: CheckOutRequest,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
):
    result = lodge_svc.check_out(db, booking_id, data)
    booking = result["booking"]
    bg.add_task(hk_manager.broadcast, {
        "type": "room_dirty",
        "room_id": str(booking.room_id),
        "room_number": booking.room.room_number,
    })
    return result
