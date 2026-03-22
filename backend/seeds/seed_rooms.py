"""
Seed 2 room types (AC / Non-AC) and 13 AC rooms for Hotel Sukhsagar.
Run: cd backend && .venv/bin/python seeds/seed_rooms.py

Pricing:
  AC Room    — ₹1000/night  (GST 12% — tariff < ₹2500 slab)
  Non-AC Room — ₹700/night  (GST 12%)
  Update base_rate via admin panel once confirmed with management.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.lodge import RoomType, Room
from app.models.enums import RoomStatus, HousekeepingStatus


ROOMS = [
    # (room_number, floor)
    ("101", 1), ("102", 1), ("103", 1), ("104", 1), ("105", 1),
    ("201", 2), ("202", 2), ("203", 2), ("204", 2),
    ("205", 2), ("206", 2), ("207", 2), ("208", 2),
]


def seed():
    db = SessionLocal()
    try:
        # ── Room Types ────────────────────────────────────────────────────────
        ac_type = db.query(RoomType).filter_by(name="AC Room").first()
        if not ac_type:
            ac_type = RoomType(name="AC Room", base_rate=1000.00, gst_rate=12.0)
            db.add(ac_type)
            print("Created room type: AC Room @ ₹1000/night (12% GST)")
        else:
            print("Room type 'AC Room' already exists, skipping.")

        nonac_type = db.query(RoomType).filter_by(name="Non-AC Room").first()
        if not nonac_type:
            nonac_type = RoomType(name="Non-AC Room", base_rate=700.00, gst_rate=12.0)
            db.add(nonac_type)
            print("Created room type: Non-AC Room @ ₹700/night (12% GST)")
        else:
            print("Room type 'Non-AC Room' already exists, skipping.")

        db.flush()

        # ── 13 Rooms (all physically AC) ─────────────────────────────────────
        created = 0
        for room_number, floor in ROOMS:
            exists = db.query(Room).filter_by(room_number=room_number).first()
            if exists:
                print(f"  Room {room_number} already exists, skipping.")
                continue
            db.add(Room(
                room_type_id=ac_type.id,
                room_number=room_number,
                floor=floor,
                status=RoomStatus.available,
                housekeeping=HousekeepingStatus.clean,
            ))
            created += 1

        db.commit()
        total = db.query(Room).count()
        print(f"\nDone! {created} rooms created. Total: {total} rooms.")
        print("Note: Update pricing via admin panel once confirmed with management.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
