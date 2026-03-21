import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.enums import UserRole
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import user as user_svc

router = APIRouter(prefix="/users", tags=["Users"])

_admin_only = Depends(require_roles(UserRole.admin))
_admin_manager = Depends(require_roles(UserRole.admin, UserRole.manager))


@router.post("/", response_model=UserRead, dependencies=[_admin_only])
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    return user_svc.create_user(db, data)


@router.get("/", response_model=List[UserRead], dependencies=[_admin_manager])
def list_users(db: Session = Depends(get_db)):
    return user_svc.list_users(db)


@router.get("/{user_id}", response_model=UserRead, dependencies=[_admin_manager])
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    return user_svc.get_user_by_id(db, user_id)


@router.patch("/{user_id}", response_model=UserRead, dependencies=[_admin_only])
def update_user(user_id: uuid.UUID, data: UserUpdate, db: Session = Depends(get_db)):
    return user_svc.update_user(db, user_id, data)
