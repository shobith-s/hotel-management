import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user_from_query
from app.models.billing import Bill
from app.models.enums import BookingStatus, UserRole
from app.models.lodge import Booking
from app.models.order import Order, OrderItem
from app.api.v1.routes.settings import load_settings

try:
    import qrcode
    import qrcode.image.svg
    _QRCODE_OK = True
except ImportError:
    _QRCODE_OK = False

router = APIRouter(prefix="/print", tags=["Print"])


# ── Amount in words (Indian number system) ────────────────────────────────────

def _amount_in_words(amount: float) -> str:
    _ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen',
    ]
    _tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    def _two(n: int) -> str:
        if n == 0:
            return ''
        if n < 20:
            return _ones[n]
        t = _tens[n // 10]
        o = _ones[n % 10]
        return t + (' ' + o if o else '')

    def _three(n: int) -> str:
        if n == 0:
            return ''
        h, rest = divmod(n, 100)
        parts = []
        if h:
            parts.append(_ones[h] + ' Hundred')
        td = _two(rest)
        if td:
            parts.append(td)
        return ' '.join(parts)

    rupees = int(amount)
    paise = round((amount - rupees) * 100)

    if rupees == 0 and paise == 0:
        return 'Zero Rupees Only'

    r = rupees
    parts = []

    if r >= 10_000_000:
        c, r = divmod(r, 10_000_000)
        w = _three(c)
        if w:
            parts.append(w + ' Crore')
    if r >= 100_000:
        lk, r = divmod(r, 100_000)
        w = _two(lk)
        if w:
            parts.append(w + ' Lakh')
    if r >= 1_000:
        t, r = divmod(r, 1_000)
        w = _two(t)
        if w:
            parts.append(w + ' Thousand')
    if r > 0:
        w = _three(r)
        if w:
            parts.append(w)

    result = ' '.join(parts) + ' Rupees'
    if paise > 0:
        result += f' and {_two(paise)} Paise'
    result += ' Only'
    return result


# ── QR code helper ─────────────────────────────────────────────────────────────

def _upi_qr_svg(upi_id: str, amount: float, ref: str, name: str) -> str:
    if not _QRCODE_OK:
        return ''
    upi_str = f"upi://pay?pa={upi_id}&pn={name}&am={amount:.2f}&cu=INR&tn={ref}"
    factory = qrcode.image.svg.SvgPathImage
    qr = qrcode.QRCode(box_size=4, border=2)
    qr.add_data(upi_str)
    qr.make(fit=True)
    img = qr.make_image(image_factory=factory)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode('utf-8')


# ── Shared print stylesheet ────────────────────────────────────────────────────

_PRINT_CSS = """
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    color: #111;
    background: #fff;
    padding: 24px;
    max-width: 400px;
    margin: 0 auto;
  }
  .center { text-align: center; }
  .hotel-name { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
  .hotel-sub  { font-size: 11px; color: #555; margin-top: 2px; }
  .divider    { border: none; border-top: 1px dashed #aaa; margin: 10px 0; }
  .divider-solid { border: none; border-top: 1px solid #333; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; padding-bottom: 4px; }
  td { padding: 3px 0; vertical-align: top; }
  .td-r { text-align: right; }
  .td-c { text-align: center; }
  .bold  { font-weight: bold; }
  .total-row td { font-weight: bold; font-size: 15px; padding-top: 6px; }
  .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
  .label { color: #555; }
  .total-words { font-size: 11px; color: #555; font-style: italic; margin-top: 4px; }
  .footer { text-align: center; font-size: 11px; color: #777; margin-top: 16px; }
  .qr-wrap { text-align: center; margin: 12px 0 4px; }
  .qr-wrap svg { width: 120px; height: 120px; }
  .qr-label { font-size: 10px; color: #777; margin-top: 4px; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
"""

_PRINT_BUTTON = """
  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()"
      style="padding:10px 28px;font-size:14px;cursor:pointer;
             border:1px solid #333;border-radius:6px;background:#111;color:#fff;">
      Print / Save as PDF
    </button>
  </div>
"""


def _fmt_dt(dt) -> str:
    if dt is None:
        return "—"
    return dt.strftime("%d/%m/%Y %H:%M")


def _fmt_date(dt) -> str:
    if dt is None:
        return "—"
    return dt.strftime("%d/%m/%Y")


def _hotel_header(s) -> str:
    lines = [f'<p class="hotel-name">{s.name}</p>']
    if s.address:
        lines.append(f'<p class="hotel-sub">{s.address}</p>')
    if s.phone:
        lines.append(f'<p class="hotel-sub">Ph: {s.phone}</p>')
    if s.gstin:
        lines.append(f'<p class="hotel-sub">GSTIN: {s.gstin}</p>')
    return "\n".join(lines)


# ── Restaurant Bill ────────────────────────────────────────────────────────────

@router.get("/bill/{bill_id}", response_class=HTMLResponse)
def print_bill(bill_id: uuid.UUID, token: str = Query(...), db: Session = Depends(get_db)):
    return _render_bill(bill_id, token, db)


def _render_bill(bill_id: uuid.UUID, token: str, db: Session):
    get_current_user_from_query(token, db)
    s = load_settings()

    bill = (
        db.query(Bill)
        .options(
            joinedload(Bill.order).joinedload(Order.table),
            joinedload(Bill.order).joinedload(Order.waiter),
            joinedload(Bill.order).joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Bill.order).joinedload(Order.items).joinedload(OrderItem.variant),
            joinedload(Bill.served_by_user),
        )
        .filter(Bill.id == bill_id)
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    order = bill.order
    active_items = [i for i in order.items if not i.is_voided]

    items_rows = ""
    for item in active_items:
        name = item.menu_item.name
        if item.variant:
            name += f" ({item.variant.label})"
        amount = float(item.unit_price) * item.quantity
        items_rows += f"""
        <tr>
          <td>{name}</td>
          <td class="td-c">{item.quantity}</td>
          <td class="td-r">₹{float(item.unit_price):.0f}</td>
          <td class="td-r">₹{amount:.0f}</td>
        </tr>"""

    cgst = float(bill.cgst_amount)
    sgst = float(bill.sgst_amount)
    igst = float(bill.igst_amount)
    discount = float(bill.discount_amount)
    service  = float(bill.service_charge)
    subtotal = float(bill.subtotal)
    total    = float(bill.grand_total)

    gst_rows = ""
    if cgst or sgst:
        gst_rows += f'<div class="meta-row"><span class="label">CGST</span><span>₹{cgst:.2f}</span></div>'
        gst_rows += f'<div class="meta-row"><span class="label">SGST</span><span>₹{sgst:.2f}</span></div>'
    if igst:
        gst_rows += f'<div class="meta-row"><span class="label">IGST</span><span>₹{igst:.2f}</span></div>'
    if service:
        gst_rows += f'<div class="meta-row"><span class="label">Service Charge</span><span>₹{service:.2f}</span></div>'
    if discount:
        gst_rows += f'<div class="meta-row"><span class="label">Discount</span><span>-₹{discount:.2f}</span></div>'

    payment_mode = (bill.payment_mode.value if bill.payment_mode else "Pending").upper()
    waiter_name  = order.waiter.name if order.waiter else "—"
    table_num    = order.table.table_number if order.table else "—"
    total_words  = _amount_in_words(total)

    qr_block = ""
    if s.upi_id and _QRCODE_OK:
        svg = _upi_qr_svg(s.upi_id, total, bill.bill_number, s.name)
        qr_block = f"""
  <hr class="divider">
  <div class="qr-wrap">{svg}</div>
  <p class="qr-label center">Scan to pay · UPI: {s.upi_id}</p>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bill {bill.bill_number}</title>
  <style>{_PRINT_CSS}</style>
</head>
<body>
  <div class="center">
    {_hotel_header(s)}
  </div>

  <hr class="divider">

  <div class="center" style="font-size:12px;font-weight:bold;letter-spacing:2px;">RESTAURANT BILL</div>

  <hr class="divider">

  <div class="meta-row"><span class="label">Bill No.</span><span class="bold">{bill.bill_number}</span></div>
  <div class="meta-row"><span class="label">Date</span><span>{_fmt_dt(bill.created_at)}</span></div>
  <div class="meta-row"><span class="label">Table</span><span>{table_num}</span></div>
  <div class="meta-row"><span class="label">Served By</span><span>{waiter_name}</span></div>

  <hr class="divider">

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="td-c">Qty</th>
        <th class="td-r">Rate</th>
        <th class="td-r">Amt</th>
      </tr>
    </thead>
    <tbody>
      {items_rows}
    </tbody>
  </table>

  <hr class="divider">

  <div class="meta-row"><span class="label">Subtotal</span><span>₹{subtotal:.2f}</span></div>
  {gst_rows}

  <hr class="divider-solid">

  <div class="meta-row bold" style="font-size:15px;">
    <span>TOTAL</span><span>₹{total:.2f}</span>
  </div>
  <p class="total-words">{total_words}</p>

  <hr class="divider">

  <div class="meta-row"><span class="label">Payment</span><span class="bold">{payment_mode}</span></div>
  {"<div class='meta-row'><span class='label'>Paid At</span><span>" + _fmt_dt(bill.paid_at) + "</span></div>" if bill.paid_at else ""}

  {qr_block}

  <hr class="divider">

  <div class="footer">
    Thank you for dining with us!<br>
    Please visit again.
  </div>

  {_PRINT_BUTTON}
</body>
</html>"""

    return HTMLResponse(content=html)


# ── Lodge Checkout Receipt ─────────────────────────────────────────────────────

@router.get("/lodge/{booking_id}", response_class=HTMLResponse)
def print_lodge_receipt(booking_id: uuid.UUID, token: str = Query(...), db: Session = Depends(get_db)):
    return _render_lodge(booking_id, token, db)


def _render_lodge(booking_id: uuid.UUID, token: str, db: Session):
    user = get_current_user_from_query(token, db)
    if user.role not in (UserRole.admin, UserRole.manager, UserRole.receptionist):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    s = load_settings()

    booking: Booking | None = (
        db.query(Booking)
        .options(
            joinedload(Booking.guest),
            joinedload(Booking.room).joinedload("room_type"),
            joinedload(Booking.charges),
        )
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != BookingStatus.checked_out:
        raise HTTPException(status_code=400, detail="Booking has not been checked out yet")

    guest = booking.guest
    room  = booking.room
    rt    = room.room_type

    nights = max(1, (booking.check_out_at - booking.check_in_at).days) if booking.check_out_at else 0
    nightly_rate = float(booking.nightly_rate)
    room_charge  = nightly_rate * nights
    gst_rate     = float(rt.gst_rate)
    gst_amount   = round(room_charge * gst_rate / 100, 2)
    advance      = float(booking.advance_paid)

    extra_rows = ""
    extra_total = 0.0
    for charge in booking.charges:
        if charge.charge_type.value != "room":
            extra_rows += f"""
            <div class="meta-row">
              <span class="label">{charge.description}</span>
              <span>₹{float(charge.amount):.2f}</span>
            </div>"""
            extra_total += float(charge.amount)

    grand_total = room_charge + gst_amount + extra_total - advance
    total_words = _amount_in_words(max(grand_total, 0))

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lodge Receipt — {guest.name}</title>
  <style>{_PRINT_CSS}</style>
</head>
<body>
  <div class="center">
    {_hotel_header(s)}
  </div>

  <hr class="divider">

  <div class="center" style="font-size:12px;font-weight:bold;letter-spacing:2px;">LODGE RECEIPT</div>

  <hr class="divider">

  <div class="meta-row"><span class="label">Guest</span><span class="bold">{guest.name}</span></div>
  <div class="meta-row"><span class="label">Phone</span><span>{guest.phone}</span></div>
  <div class="meta-row"><span class="label">ID</span><span>{guest.id_type.value.upper()} {guest.id_number}</span></div>

  <hr class="divider">

  <div class="meta-row"><span class="label">Room</span><span class="bold">{room.room_number}</span></div>
  <div class="meta-row"><span class="label">Room Type</span><span>{rt.name}</span></div>
  <div class="meta-row"><span class="label">AC</span><span>{"Yes" if booking.ac_used else "No"}</span></div>
  <div class="meta-row"><span class="label">Check-in</span><span>{_fmt_dt(booking.check_in_at)}</span></div>
  <div class="meta-row"><span class="label">Check-out</span><span>{_fmt_dt(booking.check_out_at)}</span></div>
  <div class="meta-row"><span class="label">Nights</span><span>{nights}</span></div>

  <hr class="divider">

  <div class="meta-row">
    <span class="label">Room Charge ({nights} × ₹{nightly_rate:.0f})</span>
    <span>₹{room_charge:.2f}</span>
  </div>
  {extra_rows}
  <div class="meta-row">
    <span class="label">GST ({gst_rate:.0f}%)</span>
    <span>₹{gst_amount:.2f}</span>
  </div>
  {"<div class='meta-row'><span class='label'>Advance Paid</span><span>-₹" + f"{advance:.2f}</span></div>" if advance else ""}

  <hr class="divider-solid">

  <div class="meta-row bold" style="font-size:15px;">
    <span>TOTAL</span><span>₹{grand_total:.2f}</span>
  </div>
  <p class="total-words">{total_words}</p>

  <hr class="divider">

  <div class="footer">
    Thank you for staying with us!<br>
    We look forward to welcoming you again.
  </div>

  {_PRINT_BUTTON}
</body>
</html>"""

    return HTMLResponse(content=html)
