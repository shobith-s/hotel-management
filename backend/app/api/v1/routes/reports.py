from datetime import date, datetime, time, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import require_roles
from app.models.billing import Bill
from app.models.enums import BookingStatus, ChargeType, PaymentMode, PaymentStatus
from app.models.lodge import Booking, BookingCharge, Room, RoomType
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem

router = APIRouter(prefix="/reports", tags=["Reports"])

_admin_manager = Depends(require_roles("admin", "manager"))


class PaymentBreakdown(BaseModel):
    cash: float = 0
    card: float = 0
    upi: float = 0
    complimentary: float = 0
    credit: float = 0


class TopItem(BaseModel):
    name: str
    quantity_sold: int
    revenue: float


class VoidSummary(BaseModel):
    count: int
    value: float


class RevenueReport(BaseModel):
    start_date: str
    end_date: str
    # Restaurant
    restaurant_revenue: float
    restaurant_gst: float
    total_bills: int
    avg_spend_per_bill: float
    payment_modes: PaymentBreakdown
    # Lodge
    lodge_revenue: float
    total_checkouts: int
    # Combined
    total_revenue: float
    total_gst: float
    # Detail
    top_items: List[TopItem]
    total_discount: float
    void_summary: VoidSummary


@router.get("/summary", response_model=RevenueReport, dependencies=[_admin_manager])
def revenue_summary(
    start: date = Query(..., description="Start date YYYY-MM-DD"),
    end: date   = Query(..., description="End date YYYY-MM-DD (inclusive)"),
    db: Session = Depends(get_db),
):
    start_dt = datetime.combine(start, time.min)
    end_dt   = datetime.combine(end,   time.max)

    # ── Restaurant bills (paid within date range) ──────────────────────────────
    paid_bills = (
        db.query(Bill)
        .filter(
            Bill.payment_status == PaymentStatus.paid,
            Bill.paid_at >= start_dt,
            Bill.paid_at <= end_dt,
        )
        .all()
    )

    restaurant_revenue = sum(float(b.grand_total) for b in paid_bills)
    restaurant_gst     = sum(float(b.cgst_amount) + float(b.sgst_amount) + float(b.igst_amount) for b in paid_bills)
    total_discount     = sum(float(b.discount_amount) for b in paid_bills)
    total_bills        = len(paid_bills)
    avg_spend          = round(restaurant_revenue / total_bills, 2) if total_bills else 0.0

    # Payment mode breakdown
    mode_totals: dict[str, float] = {m.value: 0.0 for m in PaymentMode}
    for b in paid_bills:
        if b.payment_mode:
            mode_totals[b.payment_mode.value] += float(b.grand_total)
    payment_breakdown = PaymentBreakdown(**mode_totals)

    # ── Top 10 selling items (from paid orders in date range) ──────────────────
    bill_order_ids = [b.order_id for b in paid_bills if b.order_id]

    top_rows: list[TopItem] = []
    if bill_order_ids:
        top_raw = (
            db.query(
                MenuItem.name,
                func.sum(OrderItem.quantity).label("qty"),
                func.sum(OrderItem.quantity * OrderItem.unit_price).label("rev"),
            )
            .join(OrderItem, OrderItem.menu_item_id == MenuItem.id)
            .filter(
                OrderItem.order_id.in_(bill_order_ids),
                OrderItem.is_voided == False,  # noqa: E712
            )
            .group_by(MenuItem.id, MenuItem.name)
            .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price).desc())
            .limit(10)
            .all()
        )
        top_rows = [TopItem(name=r.name, quantity_sold=int(r.qty), revenue=round(float(r.rev), 2)) for r in top_raw]

    # ── Void summary (voided items from orders in date range) ─────────────────
    void_count = 0
    void_value = 0.0
    if bill_order_ids:
        void_raw = (
            db.query(
                func.count(OrderItem.id).label("cnt"),
                func.sum(OrderItem.quantity * OrderItem.unit_price).label("val"),
            )
            .filter(
                OrderItem.order_id.in_(bill_order_ids),
                OrderItem.is_voided == True,  # noqa: E712
            )
            .first()
        )
        if void_raw and void_raw.cnt:
            void_count = int(void_raw.cnt)
            void_value = round(float(void_raw.val or 0), 2)

    # ── Lodge revenue (room charges from checked-out bookings) ─────────────────
    lodge_charges = (
        db.query(BookingCharge)
        .join(Booking, BookingCharge.booking_id == Booking.id)
        .filter(
            BookingCharge.charge_type == ChargeType.room,
            Booking.status == BookingStatus.checked_out,
            Booking.check_out_at >= start_dt,
            Booking.check_out_at <= end_dt,
        )
        .all()
    )
    lodge_revenue = sum(float(c.amount) for c in lodge_charges)

    total_checkouts = (
        db.query(func.count(Booking.id))
        .filter(
            Booking.status == BookingStatus.checked_out,
            Booking.check_out_at >= start_dt,
            Booking.check_out_at <= end_dt,
        )
        .scalar()
        or 0
    )

    total_revenue = restaurant_revenue + lodge_revenue
    total_gst     = restaurant_gst

    return RevenueReport(
        start_date=str(start),
        end_date=str(end),
        restaurant_revenue=round(restaurant_revenue, 2),
        restaurant_gst=round(restaurant_gst, 2),
        total_bills=total_bills,
        avg_spend_per_bill=avg_spend,
        payment_modes=payment_breakdown,
        lodge_revenue=round(lodge_revenue, 2),
        total_checkouts=total_checkouts,
        total_revenue=round(total_revenue, 2),
        total_gst=round(total_gst, 2),
        top_items=top_rows,
        total_discount=round(total_discount, 2),
        void_summary=VoidSummary(count=void_count, value=void_value),
    )


# ── Lodge Occupancy Report ─────────────────────────────────────────────────────

class DailyOccupancy(BaseModel):
    date: str
    occupied_rooms: int
    occupancy_pct: float


class RoomTypeBreakdown(BaseModel):
    room_type: str
    total_rooms: int
    occupied_nights: int
    revenue: float


class OccupancyReport(BaseModel):
    start_date: str
    end_date: str
    total_rooms: int
    total_room_nights: int   # total_rooms × days in range
    occupied_nights: int     # sum of all occupied room-nights
    avg_occupancy_pct: float
    revpar: float            # total_revenue / total_room_nights
    adr: float               # total_revenue / occupied_nights
    total_revenue: float
    daily: List[DailyOccupancy]
    by_room_type: List[RoomTypeBreakdown]


@router.get("/occupancy", response_model=OccupancyReport, dependencies=[_admin_manager])
def occupancy_report(
    start: date = Query(..., description="Start date YYYY-MM-DD"),
    end:   date = Query(..., description="End date YYYY-MM-DD (inclusive)"),
    db: Session = Depends(get_db),
):
    start_dt = datetime.combine(start, time.min)
    end_dt   = datetime.combine(end,   time.max)

    total_rooms: int = db.query(func.count(Room.id)).scalar() or 0

    # All bookings that overlap the date range
    bookings = (
        db.query(Booking)
        .filter(
            Booking.status.in_([BookingStatus.active, BookingStatus.checked_out]),
            Booking.check_in_at <= end_dt,
            or_(
                Booking.check_out_at >= start_dt,
                Booking.check_out_at.is_(None),
            ),
        )
        .all()
    )

    # Daily occupancy — iterate each day in range
    days: list[date] = []
    d = start
    while d <= end:
        days.append(d)
        d += timedelta(days=1)

    daily_rows: list[DailyOccupancy] = []
    total_occupied_nights = 0

    for day in days:
        count = 0
        for b in bookings:
            ci = b.check_in_at.date()
            co = b.check_out_at.date() if b.check_out_at else (end + timedelta(days=1))
            # Same-day checkout counts as 1 occupied night on check-in date
            if co <= ci:
                co = ci + timedelta(days=1)
            if ci <= day < co:
                count += 1
        pct = round(count / total_rooms * 100, 1) if total_rooms else 0.0
        daily_rows.append(DailyOccupancy(date=str(day), occupied_rooms=count, occupancy_pct=pct))
        total_occupied_nights += count

    avg_occupancy = round(total_occupied_nights / (total_rooms * len(days)) * 100, 1) if total_rooms and days else 0.0

    # Revenue: room charges from checked-out bookings in range
    room_charges = (
        db.query(BookingCharge)
        .join(Booking, BookingCharge.booking_id == Booking.id)
        .filter(
            BookingCharge.charge_type == ChargeType.room,
            Booking.status == BookingStatus.checked_out,
            Booking.check_out_at >= start_dt,
            Booking.check_out_at <= end_dt,
        )
        .all()
    )
    total_revenue = round(sum(float(c.amount) for c in room_charges), 2)

    total_room_nights = total_rooms * len(days)
    revpar = round(total_revenue / total_room_nights, 2) if total_room_nights else 0.0
    adr    = round(total_revenue / total_occupied_nights, 2) if total_occupied_nights else 0.0

    # Room type breakdown
    room_types = (
        db.query(RoomType)
        .options(joinedload(RoomType.rooms))
        .all()
    )

    breakdown: list[RoomTypeBreakdown] = []
    for rt in room_types:
        rt_room_ids = {r.id for r in rt.rooms}
        if not rt_room_ids:
            continue
        rt_bookings = [b for b in bookings if b.room_id in rt_room_ids]

        occ_nights = 0
        for day in days:
            for b in rt_bookings:
                ci = b.check_in_at.date()
                co = b.check_out_at.date() if b.check_out_at else (end + timedelta(days=1))
                if co <= ci:
                    co = ci + timedelta(days=1)
                if ci <= day < co:
                    occ_nights += 1

        rt_booking_ids = [b.id for b in rt_bookings if b.status == BookingStatus.checked_out
                          and b.check_out_at and start_dt <= b.check_out_at <= end_dt]
        rt_revenue = 0.0
        if rt_booking_ids:
            rt_revenue = float(
                db.query(func.sum(BookingCharge.amount))
                .filter(
                    BookingCharge.booking_id.in_(rt_booking_ids),
                    BookingCharge.charge_type == ChargeType.room,
                )
                .scalar() or 0
            )

        breakdown.append(RoomTypeBreakdown(
            room_type=rt.name,
            total_rooms=len(rt_room_ids),
            occupied_nights=occ_nights,
            revenue=round(rt_revenue, 2),
        ))

    return OccupancyReport(
        start_date=str(start),
        end_date=str(end),
        total_rooms=total_rooms,
        total_room_nights=total_room_nights,
        occupied_nights=total_occupied_nights,
        avg_occupancy_pct=avg_occupancy,
        revpar=revpar,
        adr=adr,
        total_revenue=total_revenue,
        daily=daily_rows,
        by_room_type=breakdown,
    )
