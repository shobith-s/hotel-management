"""
Seed 16 tables across 2 sections for Hotel Sukhsagar.
Run: cd backend && .venv/bin/python seeds/seed_tables.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.table import Table, TableSection
from app.models.enums import TableStatus


def seed():
    db = SessionLocal()
    try:
        # Layout: Main Hall (T01–T10) + Garden/Terrace (T11–T16)
        sections = [
            ("Main Hall",      [("T-01", 2), ("T-02", 2), ("T-03", 4), ("T-04", 4),
                                ("T-05", 4), ("T-06", 4), ("T-07", 6), ("T-08", 6),
                                ("T-09", 6), ("T-10", 8)]),
            ("Garden/Terrace", [("T-11", 4), ("T-12", 4), ("T-13", 4),
                                ("T-14", 6), ("T-15", 6), ("T-16", 8)]),
        ]

        for section_name, tables in sections:
            existing = db.query(TableSection).filter_by(name=section_name).first()
            if existing:
                section = existing
                print(f"Section '{section_name}' already exists, skipping.")
            else:
                section = TableSection(name=section_name)
                db.add(section)
                db.flush()

            for table_number, capacity in tables:
                exists = db.query(Table).filter_by(table_number=table_number).first()
                if exists:
                    print(f"  Table {table_number} already exists, skipping.")
                    continue
                db.add(Table(
                    section_id=section.id,
                    table_number=table_number,
                    capacity=capacity,
                    status=TableStatus.available,
                ))

        db.commit()

        total = db.query(Table).count()
        print(f"Done! {total} tables across {db.query(TableSection).count()} sections.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
