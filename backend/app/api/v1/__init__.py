from fastapi import APIRouter

from app.api.v1.routes import auth, billing, lodge, menu, orders, print_routes, reports, tables, users

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(menu.router)
router.include_router(tables.router)
router.include_router(orders.router)
router.include_router(billing.router)
router.include_router(lodge.router)
router.include_router(print_routes.router)
router.include_router(reports.router)
