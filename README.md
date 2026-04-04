# Hotel Sukhsagar — Management System

Full-stack hotel and restaurant management system built for **Hotel Sukhsagar (Desi Dhaba), Miraj**. Covers restaurant operations (ordering, kitchen display, billing) and lodge operations (check-in, check-out, housekeeping).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS |
| State / Data fetching | TanStack Query v5 |
| Routing | React Router v6 |
| Backend | FastAPI + Uvicorn |
| Database | PostgreSQL + SQLAlchemy 2 + Alembic |
| Auth | JWT (python-jose) + bcrypt |
| Real-time | WebSocket (KDS live updates) |
| Rate limiting | slowapi |

---

## Features

### Authentication & Access Control
- JWT login with bcrypt password hashing
- Role-based access: **Admin**, **Manager**, **Waiter**, **Receptionist**, **Housekeeping**
- Frontend route protection — users redirected to their role's home page
- Force-password-change enforcement on first login and after admin resets
- Login rate limiting (10 attempts/min per IP)
- Logout with server-side token revocation
- Auto-logout on token expiry (401 interceptor)

### Restaurant — Order Management
- Table grid with status badges (Available / Occupied / Bill Requested)
- Full menu browser with category sidebar and search
- Half / Full variant support with inline picker
- Per-item special instructions (notes) entered in cart, displayed prominently on KDS
- Voice ordering — hold-to-speak, NLP menu parsing, fuzzy item matching, confirmation modal
- Send order to kitchen (creates order in backend, updates table status)

### Kitchen Display System (KDS)
- Live order feed with 5-second polling
- Visual status progression: **New → In Preparation → Ready**
- Per-item special instructions displayed in amber below the item name
- Elapsed time per order, table number display
- Mark order ready (updates backend)

### Billing
- Table grid highlights bill-requested tables
- Auto-fetches active order for selected table
- Configurable service charge % (set in Settings)
- GST breakdown (CGST 2.5% + SGST 2.5%)
- Payment modes: Cash, Card, UPI
- **Split bill** — choose number of shares, settle each share individually
- Settle payment and clear table

### Lodge Management
- Room grid with status badges (Available / Occupied / Maintenance / Reserved)
- **Check-in**: guest creation + booking with date/time picker, configurable default checkout time
- **Check-out**: full bill receipt with room charges, GST (per room type rate), and extra charges breakdown
- Active bookings list with guest details

### Housekeeping
- Mobile-first dedicated page for housekeeping staff (no sidebar)
- Rooms grouped by floor with status cards: **Dirty → In Progress → Clean**
- Summary tiles with counts; tap to filter by status
- Guest / Vacant badge per room
- One-tap status cycle button per room card
- Auto-refreshes every 30 seconds

### Menu Management (Admin / Manager)
- Add / edit categories and items
- Mark items available / unavailable
- Half / Full variant pricing
- Audit log of all changes

### User Management (Admin)
- Create, edit, activate / deactivate users
- Assign roles (Admin, Manager, Waiter, Receptionist, Housekeeping)
- Reset passwords (triggers force-password-change on next login)

### Reports (Admin / Manager)
- Revenue and occupancy reports with date range selection
- Preset date ranges: Today / This Week / This Month / Last Month
- Native date picker for custom ranges
- Export to CSV

### Settings (Admin)
- Hotel name and contact info
- Service charge percentage
- Default checkout time

### Dashboard
- Live table occupancy count and table status grid
- Table tiles show number and seat capacity
- Lodge availability count and occupancy bar

---

## Pending / Planned

- **Thermal / PDF bill printing** — receipt generation for restaurant and lodge bills
- **Credit payment ledger** — track what guests owe when paying on credit
- **AC usage flag** — show/edit `ac_used` in lodge checkout summary
- **WhatsApp bill sharing**
- **CSV menu import**
- **Offline queue** (service worker + IndexedDB)
- **Drag-drop table layout editor**
- **RevPAR analytics**
- **QR code ordering**

---

## Project Structure

```
hotel-management/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/     # FastAPI route handlers
│   │   ├── core/              # Config, DB, security, rate limiter
│   │   ├── models/            # SQLAlchemy models + enums
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # Business logic
│   ├── alembic/               # Database migrations
│   ├── seeds/                 # Seed scripts (menu, rooms, tables)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/               # Axios API client functions
        ├── components/shared/ # Layout, Sidebar, TopBar, Skeleton, RequireAuth
        ├── context/           # AuthContext (user + role)
        ├── hooks/             # useVoiceOrder
        └── pages/             # One file per page
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

---

### 1. Database

```bash
psql -U postgres
CREATE USER hoteluser WITH PASSWORD 'hotelpass';
CREATE DATABASE hotel_db OWNER hoteluser;
\q
```

---

### 2. Backend

```bash
cd backend

# Create and activate virtualenv
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env             # or create manually (see below)

# Run migrations
alembic upgrade head

# Seed initial data (menu, tables, rooms)
python seeds/seed_menu.py
python seeds/seed_tables.py
python seeds/seed_rooms.py

# Start server
uvicorn app.main:app --reload
```

Backend runs at **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

**`.env` file:**
```env
DATABASE_URL=postgresql://hoteluser:hotelpass@localhost:5432/hotel_db
SECRET_KEY=<generate with: python3 -c "import secrets; print(secrets.token_hex(32))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
```

---

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at **http://localhost:5173**

---

### 4. Default Login

An admin user must be created manually on first run:

```bash
cd backend
source .venv/bin/activate
python3 -c "
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password
from app.models.enums import UserRole
import uuid

db = SessionLocal()
db.add(User(
    id=uuid.uuid4(),
    name='Admin',
    email='admin@sukhsagar.com',
    hashed_password=hash_password('admin123'),
    role=UserRole.admin,
    is_active=True,
))
db.commit()
db.close()
print('Admin created: admin@sukhsagar.com / admin123')
"
```

---

## Role Access

| Role | Accessible Pages |
|---|---|
| Admin | All pages |
| Manager | Dashboard, Menu, Orders, Kitchen, Billing, Lodge, Reports, Users |
| Waiter | Dashboard, Orders, Kitchen |
| Receptionist | Dashboard, Billing, Lodge |
| Housekeeping | Housekeeping (mobile view only) |
