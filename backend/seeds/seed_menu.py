"""
Seed Hotel Sukhsagar - Desi Dhaba full menu.
Run: cd backend && .venv/bin/python seeds/seed_menu.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.menu import MenuCategory, MenuItem, MenuItemVariant


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def category(db, name: str, order: int) -> MenuCategory:
    existing = db.query(MenuCategory).filter_by(name=name).first()
    if existing:
        return existing
    cat = MenuCategory(name=name, display_order=order, is_active=True)
    db.add(cat)
    db.flush()
    return cat


def item(db, cat: MenuCategory, name: str, *, is_veg: bool = True,
         is_market_price: bool = False, gst_rate: float = 5.0) -> MenuItem:
    mi = MenuItem(
        category_id=cat.id,
        name=name,
        is_veg=is_veg,
        is_available=True,
        is_market_price=is_market_price,
        gst_rate=gst_rate,
    )
    db.add(mi)
    db.flush()
    return mi


def single(db, cat: MenuCategory, name: str, price: float, *, is_veg: bool = True, gst_rate: float = 5.0):
    """Item with one price → one default variant."""
    mi = item(db, cat, name, is_veg=is_veg, gst_rate=gst_rate)
    db.add(MenuItemVariant(menu_item_id=mi.id, label="Regular", price=price, is_default=True))


def half_full(db, cat: MenuCategory, name: str, half: float, full: float, *, is_veg: bool = True, gst_rate: float = 5.0):
    """Item with Half / Full variants."""
    mi = item(db, cat, name, is_veg=is_veg, gst_rate=gst_rate)
    db.add(MenuItemVariant(menu_item_id=mi.id, label="Half", price=half, is_default=True))
    db.add(MenuItemVariant(menu_item_id=mi.id, label="Full", price=full, is_default=False))


def market(db, cat: MenuCategory, name: str, *, is_veg: bool = False):
    """Market-price item — price set at order time."""
    item(db, cat, name, is_veg=is_veg, is_market_price=True)


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

def seed():
    db = SessionLocal()
    try:
        print("Seeding menu…")

        # ── 1. Breakfast ─────────────────────────────────────────────────────
        breakfast = category(db, "Breakfast", 1)
        for name, price in [
            ("Shira", 40), ("Uppit", 30), ("Poha", 30),
            ("Idli Plate", 50), ("Idli Single", 30), ("Idli Wada", 60),
            ("Udid Wada", 60), ("Udid Wada Single", 30),
            ("Misal Pav", 60), ("Puri Bhaji", 60), ("Kurma Puri", 60),
            ("Masala Dosa", 60), ("Paper Dosa", 90), ("Uttappa", 70),
            ("Plain Dosa", 50), ("Paneer Dosa", 90), ("Paneer Chesse Dosa", 90),
            ("Paneer Uthappa", 90), ("Paneer Cheese Uthappa", 90),
            ("Wada Pav", 25), ("Wada Sambhar", 50),
            ("Veg Sandwich", 70), ("Veg Cheese Sandwich", 80),
            ("Grilled Veg Sandwich", 80), ("Grilled Cheese Sandwich", 90),
            ("Shabu Khichdi", 50), ("Shabu Wada", 60),
            ("Bread Toast", 50), ("Pav Bhaji", 90), ("Cheese Pav Bhaji", 110),
        ]:
            single(db, breakfast, name, price)

        # ── 2. Beverages ─────────────────────────────────────────────────────
        bev = category(db, "Beverages", 2)
        for name, price in [
            ("Tea", 10), ("Spl Tea", 20), ("Coffee", 25), ("Black Tea", 15),
            ("Lassi", 40), ("Butter Milk", 30),
            ("Juice", 70), ("Milk Shake", 90), ("Cold Coffee", 70),
        ]:
            single(db, bev, name, price)

        # ── 3. Veg Soup ──────────────────────────────────────────────────────
        veg_soup = category(db, "Veg Soup", 3)
        for name, price in [
            ("Tomato Soup", 70), ("Veg Clear Soup", 70),
            ("Veg Manchow Soup", 80), ("Veg Hot & Sour Soup", 80),
        ]:
            single(db, veg_soup, name, price)

        # ── 4. Veg Noodles ───────────────────────────────────────────────────
        veg_noodles = category(db, "Veg Noodles", 4)
        for name, price in [
            ("Hakka Noodles", 130), ("Triple Noodles", 160),
            ("Singapore Noodles", 150), ("Schezwan Noodles", 140),
        ]:
            single(db, veg_noodles, name, price)

        # ── 5. Veg Tandoor & Kabab ───────────────────────────────────────────
        veg_tandoor = category(db, "Veg Tandoor & Kabab", 5)
        for name, price in [
            ("Paneer Tikka", 200), ("Paneer Pahadi Tikka", 200),
            ("Paneer Achari Kabab", 200), ("Paneer Malai Tikka", 200),
            ("Mushroom Tikka", 180), ("Paneer Hill Top Kabab", 220),
        ]:
            single(db, veg_tandoor, name, price)

        # ── 6. Salad & Raita ─────────────────────────────────────────────────
        salad = category(db, "Salad & Raita", 6)
        for name, price in [
            ("Green Salad", 70), ("Pineapple Raita", 70),
            ("Mix Raita", 60), ("Boondi Raita", 70),
            ("Masala Papad", 30), ("Rosted Papad", 15), ("Fry Papad", 20),
        ]:
            single(db, salad, name, price)

        # ── 7. Veg Starter ───────────────────────────────────────────────────
        veg_starter = category(db, "Veg Starter", 7)
        for name, price in [
            ("Paneer Chilly", 200), ("Paneer Satay", 220), ("Paneer Crispy", 200),
            ("Veg Manchurian", 170), ("Gobi Manchurian", 170),
            ("Veg Crispy", 180), ("Paneer 65", 190),
            ("Babycorn Chilly", 190), ("Babycorn Manchurian", 190),
            ("Mushroom Chilly", 190), ("Mushroom Manchurian", 190),
            ("Finger Chips", 90),
        ]:
            single(db, veg_starter, name, price)

        # ── 8. Veg Main Course ───────────────────────────────────────────────
        veg_main = category(db, "Veg Main Course", 8)
        for name, price in [
            ("Sukhsagar Special", 220), ("Chef's Special", 200),
            ("Veg Kolhapuri", 170), ("Veg Handi", 180), ("Veg Kadai", 180),
            ("Mix Veg", 170), ("Veg Maratha", 180), ("Veg Hydrabadi", 180),
            ("Veg Makhanwala", 180), ("Veg Jaipuri", 180),
            ("Paneer Masala", 190), ("Paneer Kaju Masala", 210),
            ("Paneer Tikka Masala", 200), ("Paneer Butter Masala", 200),
            ("Paneer Hill Top Masala", 220), ("Paneer Kadai", 190),
            ("Paneer Handi", 200), ("Palak Paneer", 180),
            ("Paneer Makkhanwala", 200), ("Paneer Chingari", 220),
            ("Kaju Masala", 200), ("Dal Fry", 100), ("Dal Tadka", 110),
            ("Veg Dewani Handi", 190), ("Dal Kolhapuri", 110),
            ("Mushroom Masala", 180), ("Green Peas Masala", 180),
            ("Baby Corn Masala", 180), ("Akkha Masoor", 130),
            ("Bhendi Masala", 130), ("Baigan Masala", 130),
            ("Veg Patiyala", 200), ("Veg Malwani", 230),
            ("Paneer Punjabi Masala", 230),
        ]:
            single(db, veg_main, name, price)

        # ── 9. Roti & Bread ──────────────────────────────────────────────────
        roti = category(db, "Roti & Bread", 9)
        for name, price in [
            ("Chapati", 15), ("Roti", 20), ("Butter Roti", 25),
            ("Paratha", 35), ("Laccha Paratha", 40), ("Butter Paratha", 40),
            ("Naan", 40), ("Kulcha", 40), ("Butter Naan", 45),
            ("Butter Kulcha", 50), ("Garlic Butter Naan", 60),
            ("Alu Paratha", 70), ("Cheese Garlic Naan", 70),
            ("Paneer Paratha", 90),
        ]:
            single(db, roti, name, price)

        # ── 10. Rice ─────────────────────────────────────────────────────────
        rice = category(db, "Rice", 10)
        half_full(db, rice, "Plain Rice", 60, 90)
        half_full(db, rice, "Jeera Rice", 70, 120)
        for name, price in [
            ("Ghee Rice", 130), ("Curd Rice", 120), ("Dal Khichdi", 130),
            ("Veg Pulav", 130), ("Masala Rice", 120), ("Veg Biryani", 150),
            ("Veg Fried Rice", 130), ("Veg Sezvan Rice", 140),
            ("Veg Triple Rice", 170), ("Dal Khichdi Tadka", 140),
        ]:
            single(db, rice, name, price)

        # ── 11. Non Veg Soup ─────────────────────────────────────────────────
        nonveg_soup = category(db, "Non Veg Soup", 11)
        for name, price in [
            ("Chicken Clear Soup", 80), ("Chicken Manchow Soup", 90),
            ("Chicken Hot & Sour Soup", 90), ("Mutton Clear Soup", 90),
        ]:
            single(db, nonveg_soup, name, price, is_veg=False)

        # ── 12. Non Veg Noodles ──────────────────────────────────────────────
        nonveg_noodles = category(db, "Non Veg Noodles", 12)
        for name, price in [
            ("Chicken Hakka Noodles", 170), ("Chicken Triple Noodles", 210),
            ("Chicken Singapore Noodles", 180), ("Chicken Schezwan Noodles", 180),
            ("Egg Schezwan Noodles", 160), ("Egg Hakka Noodles", 150),
        ]:
            single(db, nonveg_noodles, name, price, is_veg=False)

        # ── 13. Non Veg Tandoor & Kabab ──────────────────────────────────────
        nonveg_tandoor = category(db, "Non Veg Tandoor & Kabab", 13)
        half_full(db, nonveg_tandoor, "Chicken Tandoori", 250, 500, is_veg=False)
        for name, price in [
            ("Cheif's Special", 300), ("Chicken Schezwan Tandoor", 300),
            ("Tangadi Kabab", 200), ("Chicken Tikka", 250),
            ("Pahadi Kabab", 250), ("Chicken Seekh Kabab", 250),
            ("Chicken Platter", 600), ("Achari Kabab", 250),
            ("Chicken Malai Tikka", 250), ("Chicken Noorani Kabab", 300),
            ("Matka Chicken", 300), ("Tandoori Lolypop", 250),
        ]:
            single(db, nonveg_tandoor, name, price, is_veg=False)

        # ── 14. Chinese Starter ──────────────────────────────────────────────
        chinese_starter = category(db, "Chinese Starter", 14)
        for name, price, veg in [
            ("Chicken Magnet", 260, False), ("Chicken Lollypop", 200, False),
            ("Chicken Manchurian", 230, False), ("Chicken Chilly", 230, False),
            ("Chicken Schezwan", 240, False), ("Chicken Satay", 260, False),
            ("Chicken Crispy", 240, False), ("Chicken Pepper", 230, False),
            ("Chicken Lemon", 230, False), ("Chicken 65", 190, False),
            ("Egg Chilly", 180, False), ("Chicken Cheese Oriental", 290, False),
            ("Lollypop with Gravy", 220, False),
        ]:
            single(db, chinese_starter, name, price, is_veg=veg)

        # ── 15. Non Veg Main Course ──────────────────────────────────────────
        nonveg_main = category(db, "Non Veg Main Course", 15)
        for name, half, full in [
            ("Chicken Malwani", 330, 550),
            ("Chicken Handi", 300, 580),
            ("Chicken Murgmuslan", 360, 650),
            ("Butter Chicken", 320, 580),
            ("Mutton Malwani", 380, 650),
            ("Mutton Handi", 350, 600),
        ]:
            half_full(db, nonveg_main, name, half, full, is_veg=False)
        for name, price in [
            ("Cheif's Special", 300), ("Chicken Masala", 180),
            ("Chicken Kolhapuri", 180), ("Chicken Moglai", 220),
            ("Chicken Patiyala", 250), ("Chicken Tikka Masala", 270),
            ("Chicken Kadai", 220), ("Chicken Curry", 180),
            ("Chicken Hydrabadi", 270), ("Butter Chicken Plate", 190),
            ("Chicken Makhanwala", 210), ("Chicken Fry", 180),
            ("Mutton Fry", 220), ("Mutton Kolhapuri", 250),
            ("Mutton Masala", 230), ("Mutton Curry", 230), ("Mutton Kadai", 260),
            ("Egg Makhanwala", 130), ("Egg Masala", 100),
            ("Egg Curry", 100), ("Egg Kolhapuri", 110),
        ]:
            single(db, nonveg_main, name, price, is_veg=False)

        # ── 16. Egg ──────────────────────────────────────────────────────────
        egg = category(db, "Egg", 16)
        for name, price in [
            ("Egg Boil", 30), ("Egg Omlet", 60),
            ("Egg Burji", 60), ("Egg Pakoda", 120),
        ]:
            single(db, egg, name, price, is_veg=False)

        # ── 17. Sea Food ─────────────────────────────────────────────────────
        seafood = category(db, "Sea Food", 17)
        for name in [
            "Surmai Fry", "Surmai Curry",
            "Prawns Fry", "Prawns Curry",
            "Bangda Fry", "Bangda Curry",
            "Pomfret Fry", "Pomfret Curry",
        ]:
            market(db, seafood, name, is_veg=False)

        # ── 18. Biryani (Per Kg) ─────────────────────────────────────────────
        biryani_kg = category(db, "Biryani Per Kg", 18)
        for name, price, veg in [
            ("Veg Biryani (Per Kg)", 1000, True),
            ("Egg Biryani (Per Kg)", 900, False),
            ("Chicken Biryani (Per Kg)", 1100, False),
            ("Mutton Biryani (Per Kg)", 1500, False),
        ]:
            mi = item(db, biryani_kg, name, is_veg=veg)
            db.add(MenuItemVariant(menu_item_id=mi.id, label="Per Kg", price=price, is_default=True))

        # ── 19. Thali ────────────────────────────────────────────────────────
        thali = category(db, "Thali", 19)
        for name, price, veg in [
            ("Veg Thali", 90, True),
            ("Roti Thali", 100, True),
            ("Punjabi Thali", 160, True),
            ("Spl Punjabi Thali", 220, True),
            ("Egg Thali", 160, False),
            ("Chicken Thali", 200, False),
            ("Mutton Thali", 280, False),
            ("Spl Chicken Thali", 250, False),
            ("Spl Mutton Thali", 320, False),
        ]:
            single(db, thali, name, price, is_veg=veg)

        # ── 20. Rice (Non Veg / Chinese Rice) ────────────────────────────────
        nonveg_rice = category(db, "Non Veg Rice & Chinese", 20)
        half_full(db, nonveg_rice, "Chicken Biryani", 130, 200, is_veg=False)
        half_full(db, nonveg_rice, "Mutton Biryani", 170, 250, is_veg=False)
        for name, price in [
            ("Egg Biryani", 150),
            ("Chicken Fried Rice", 180), ("Chicken Sezvan Rice", 190),
            ("Chicken Triple Rice", 220),
            ("Veg Fried Rice", 130), ("Veg Sezvan Rice", 140), ("Veg Triple Rice", 170),
        ]:
            single(db, nonveg_rice, name, price, is_veg=("Veg" in name))

        # ── 21. Cold Drinks & Ice Cream ──────────────────────────────────────
        cold = category(db, "Cold Drinks & Ice Cream", 21)
        for name, price in [
            ("Mosambi Juice", 70), ("Orange Juice", 70), ("Apple Juice", 70),
            ("Pineapple Juice", 70), ("Watermelon Juice", 70),
            ("Mango Shake", 90), ("Vanilla Shake", 90), ("Chocolate Shake", 90),
            ("Chikku Shake", 90), ("Butterscotch Shake", 90),
            ("Faluda", 110), ("Cold Coffee", 70), ("Bisleri 1 Ltr", 20),
        ]:
            single(db, cold, name, price)
        for name, small, large in [
            ("Cold Drink", 25, 50),
            ("Vanilla Ice Cream", 40, 60),
            ("Chocolate Ice Cream", 50, 80),
            ("Butterscotch Ice Cream", 50, 80),
        ]:
            half_full(db, cold, name, small, large)

        db.commit()
        print(f"Done! Menu seeded successfully.")

        # Summary
        cat_count = db.query(MenuCategory).count()
        item_count = db.query(MenuItem).count()
        variant_count = db.query(MenuItemVariant).count()
        print(f"  {cat_count} categories, {item_count} items, {variant_count} variants")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
