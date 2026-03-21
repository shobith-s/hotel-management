from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional
import uuid
from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import BookingStatus, ChargeType, HousekeepingStatus, IDType, RoomStatus

if TYPE_CHECKING:
    from .user import User
    from .order import Order


class RoomType(Base):
    __tablename__ = "room_types"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    base_rate: Mapped[float] = mapped_column(Numeric(10, 2))
    gst_rate: Mapped[float] = mapped_column(Numeric(5, 2))      # 12.0 or 18.0 based on tariff slab

    rooms: Mapped[List[Room]] = relationship("Room", back_populates="room_type")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_type_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("room_types.id"))
    room_number: Mapped[str] = mapped_column(String(20), unique=True)
    floor: Mapped[int] = mapped_column(default=1)
    status: Mapped[RoomStatus] = mapped_column(SAEnum(RoomStatus), default=RoomStatus.available)
    housekeeping: Mapped[HousekeepingStatus] = mapped_column(SAEnum(HousekeepingStatus), default=HousekeepingStatus.clean)

    room_type: Mapped[RoomType] = relationship("RoomType", back_populates="rooms")
    bookings: Mapped[List[Booking]] = relationship("Booking", back_populates="room")


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str] = mapped_column(String(15))
    id_type: Mapped[IDType] = mapped_column(SAEnum(IDType))
    id_number: Mapped[str] = mapped_column(String(50))
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    bookings: Mapped[List[Booking]] = relationship("Booking", back_populates="guest")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("rooms.id"))
    guest_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("guests.id"))
    checked_in_by: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    check_in_at: Mapped[datetime] = mapped_column()
    expected_check_out: Mapped[datetime] = mapped_column()
    check_out_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    num_guests: Mapped[int] = mapped_column(default=1)
    advance_paid: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    status: Mapped[BookingStatus] = mapped_column(SAEnum(BookingStatus), default=BookingStatus.active)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    room: Mapped[Room] = relationship("Room", back_populates="bookings")
    guest: Mapped[Guest] = relationship("Guest", back_populates="bookings")
    checked_in_by_user: Mapped[User] = relationship("User", back_populates="bookings")
    charges: Mapped[List[BookingCharge]] = relationship("BookingCharge", back_populates="booking", cascade="all, delete-orphan")


class BookingCharge(Base):
    __tablename__ = "booking_charges"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("bookings.id"))
    charge_type: Mapped[ChargeType] = mapped_column(SAEnum(ChargeType))
    description: Mapped[str] = mapped_column(String(255))
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    booking: Mapped[Booking] = relationship("Booking", back_populates="charges")
