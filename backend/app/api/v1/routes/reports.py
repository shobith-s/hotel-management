from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.billing import Bill
from app.models.enums import BookingStatus, ChargeType, PaymentMode, PaymentStatus
from app.models.lodge import Booking, BookingCharge

router = APIRouter(prefix="/reports", tags=["Reports"])

_admin_manager = Depends(require_roles("admin", "manager"))


class PaymentBreakdown(BaseModel):
    cash: float = 0
    card: float = 0
    upi: float = 0
    complimentary: float = 0
    credit: float = 0


class RevenueReport(BaseModel):
    start_date: str
    end_date: str
    # Restaurant
    restaurant_revenue: float
    restaurant_gst: float
    total_bills: int
    payment_modes: PaymentBreakdown
    # Lodge
    lodge_revenue: float
    total_checkouts: int
    # Combined
    total_revenue: float
    total_gst: float


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

    # Payment mode breakdown
    mode_totals: dict[str, float] = {m.value: 0.0 for m in PaymentMode}
    for b in paid_bills:
        if b.payment_mode:
            mode_totals[b.payment_mode.value] += float(b.grand_total)

    payment_breakdown = PaymentBreakdown(**mode_totals)

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

    # Count distinct checkouts in range
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

    # Lodge GST is embedded in checkout total, not separately tracked in BookingCharge
    # So we don't double-count it here — lodge_revenue is the room charge pre-GST sum
    total_revenue = restaurant_revenue + lodge_revenue
    total_gst     = restaurant_gst  # lodge GST is included in grand_total on receipt

    return RevenueReport(
        start_date=str(start),
        end_date=str(end),
        restaurant_revenue=round(restaurant_revenue, 2),
        restaurant_gst=round(restaurant_gst, 2),
        total_bills=len(paid_bills),
        payment_modes=payment_breakdown,
        lodge_revenue=round(lodge_revenue, 2),
        total_checkouts=total_checkouts,
        total_revenue=round(total_revenue, 2),
        total_gst=round(total_gst, 2),
    )
