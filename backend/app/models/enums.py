import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    waiter = "waiter"
    receptionist = "receptionist"


class TableStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    bill_requested = "bill_requested"
    reserved = "reserved"


class OrderStatus(str, enum.Enum):
    open = "open"
    billed = "billed"
    paid = "paid"
    cancelled = "cancelled"


class OrderSource(str, enum.Enum):
    manual = "manual"
    voice = "voice"


class PaymentMode(str, enum.Enum):
    cash = "cash"
    card = "card"
    upi = "upi"
    complimentary = "complimentary"
    credit = "credit"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"


class RoomStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    maintenance = "maintenance"
    reserved = "reserved"


class HousekeepingStatus(str, enum.Enum):
    clean = "clean"
    dirty = "dirty"
    in_progress = "in_progress"


class BookingStatus(str, enum.Enum):
    active = "active"
    checked_out = "checked_out"
    cancelled = "cancelled"


class ChargeType(str, enum.Enum):
    room = "room"
    restaurant = "restaurant"
    laundry = "laundry"
    extra = "extra"


class AuditAction(str, enum.Enum):
    add = "add"
    modify = "modify"
    void = "void"
    cancel = "cancel"


class IDType(str, enum.Enum):
    aadhaar = "aadhaar"
    passport = "passport"
    driving_license = "driving_license"
    voter_id = "voter_id"
