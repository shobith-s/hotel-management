from __future__ import annotations

import uuid
from datetime import datetime, date
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.billing import Bill
from app.models.enums import BookingStatus, ChargeType, OrderStatus, PaymentMode, PaymentStatus, TableStatus
from app.models.lodge import Booking, BookingCharge
from app.models.order import Order, OrderItem
from app.models.table import Table
from app.schemas.billing import BillCreate, PaymentRequest


def _generate_bill_number(db: Session) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"B-{today}-"
    count = db.query(Bill).filter(Bill.bill_number.like(f"{prefix}%")).count()
    return f"{prefix}{count + 1:03d}"


def _calculate_totals(
    items: list[OrderItem],
    discount: float,
    service_charge: float,
    is_igst: bool,
) -> dict:
    """
    Groups non-voided items by their GST rate, pro-rates the discount,
    and returns all amounts required to construct a Bill record.
    """
    rate_groups: dict[float, Decimal] = {}
    for item in items:
        if item.is_voided:
            continue
        rate = float(item.menu_item.gst_rate)
        line_total = Decimal(str(item.unit_price)) * item.quantity
        rate_groups[rate] = rate_groups.get(rate, Decimal("0")) + line_total

    subtotal = sum(rate_groups.values(), Decimal("0"))
    discount_dec = Decimal(str(discount))
    cgst = sgst = igst = Decimal("0")

    for rate, amount in rate_groups.items():
        # Pro-rate discount proportionally across rate groups
        ratio = (amount / subtotal) if subtotal else Decimal("0")
        taxable = amount - (discount_dec * ratio)
        tax = (taxable * Decimal(str(rate)) / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if is_igst:
            igst += tax
        else:
            half = (tax / 2).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            cgst += half
            sgst += half

    service_dec = Decimal(str(service_charge))
    taxable_total = subtotal - discount_dec
    grand_total = taxable_total + cgst + sgst + igst + service_dec

    return {
        "subtotal": float(subtotal.quantize(Decimal("0.01"))),
        "cgst_amount": float(cgst),
        "sgst_amount": float(sgst),
        "igst_amount": float(igst),
        "discount_amount": float(discount_dec.quantize(Decimal("0.01"))),
        "service_charge": float(service_dec.quantize(Decimal("0.01"))),
        "grand_total": float(grand_total.quantize(Decimal("0.01"))),
    }


def create_bill(db: Session, data: BillCreate, served_by: uuid.UUID) -> Bill:
    order = db.get(Order, data.order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != OrderStatus.open:
        raise HTTPException(400, "Order is not open")
    if db.query(Bill).filter(Bill.order_id == data.order_id).first():
        raise HTTPException(400, "Bill already generated for this order")

    billable = [i for i in order.items if not i.is_voided]
    if not billable:
        raise HTTPException(400, "No billable items on this order")

    totals = _calculate_totals(billable, data.discount_amount, data.service_charge, data.is_igst)
    bill = Bill(
        order_id=order.id,
        bill_number=_generate_bill_number(db),
        served_by=served_by,
        **totals,
    )
    db.add(bill)
    order.status = OrderStatus.billed
    db.commit()
    db.refresh(bill)
    return bill


def get_bill(db: Session, bill_id: uuid.UUID) -> Bill:
    bill = db.get(Bill, bill_id)
    if not bill:
        raise HTTPException(404, "Bill not found")
    return bill


def get_bill_by_order(db: Session, order_id: uuid.UUID) -> Bill:
    bill = db.query(Bill).filter(Bill.order_id == order_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found for this order")
    return bill


def charge_to_room(db: Session, bill_id: uuid.UUID, booking_id: uuid.UUID) -> Bill:
    bill = get_bill(db, bill_id)
    if bill.payment_status == PaymentStatus.paid:
        raise HTTPException(400, "Bill is already settled")

    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != BookingStatus.active:
        raise HTTPException(400, "Booking is not active")

    db.add(BookingCharge(
        booking_id=booking_id,
        charge_type=ChargeType.restaurant,
        description=f"Restaurant – {bill.bill_number}",
        amount=float(bill.grand_total),
        order_id=bill.order_id,
    ))

    bill.payment_mode = PaymentMode.credit
    bill.payment_status = PaymentStatus.paid
    bill.paid_at = datetime.utcnow()

    order = db.get(Order, bill.order_id)
    order.status = OrderStatus.paid

    table = db.get(Table, order.table_id)
    table.status = TableStatus.available

    db.commit()
    db.refresh(bill)
    return bill


def settle_payment(db: Session, bill_id: uuid.UUID, data: PaymentRequest) -> Bill:
    bill = get_bill(db, bill_id)
    if bill.payment_status == PaymentStatus.paid:
        raise HTTPException(400, "Bill is already settled")

    bill.payment_mode = data.payment_mode
    bill.payment_status = PaymentStatus.paid
    bill.paid_at = datetime.utcnow()

    order = db.get(Order, bill.order_id)
    order.status = OrderStatus.paid

    table = db.get(Table, order.table_id)
    table.status = TableStatus.available

    db.commit()
    db.refresh(bill)
    return bill
