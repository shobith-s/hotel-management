import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate, UserResetPassword, UserChangePassword
from app.services import user as user_svc

router = APIRouter(prefix="/users", tags=["Users"])

_admin_only = Depends(require_roles(UserRole.admin))
_admin_manager = Depends(require_roles(UserRole.admin, UserRole.manager))


@router.post("/", response_model=UserRead, dependencies=[_admin_manager])
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.manager and data.role == UserRole.admin:
        raise HTTPException(status_code=403, detail="Managers cannot create admin accounts")
    return user_svc.create_user(db, data)


@router.get("/", response_model=List[UserRead], dependencies=[_admin_manager])
def list_users(db: Session = Depends(get_db)):
    return user_svc.list_users(db)


# /me routes must come before /{user_id} to avoid UUID parse conflict
@router.post("/me/change-password", response_model=UserRead)
def change_own_password(
    data: UserChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_svc.change_own_password(db, current_user, data.current_password, data.new_password)


@router.get("/{user_id}", response_model=UserRead, dependencies=[_admin_manager])
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    return user_svc.get_user_by_id(db, user_id)


@router.patch("/{user_id}", response_model=UserRead, dependencies=[_admin_manager])
def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.manager:
        if data.role == UserRole.admin:
            raise HTTPException(status_code=403, detail="Managers cannot assign the admin role")
        if data.is_active is not None:
            raise HTTPException(status_code=403, detail="Managers cannot change account status")
    return user_svc.update_user(db, user_id, data)


@router.delete("/{user_id}", status_code=204, dependencies=[_admin_only])
def delete_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user_svc.delete_user(db, user_id)


@router.post("/{user_id}/reset-password", response_model=UserRead, dependencies=[_admin_manager])
def reset_user_password(
    user_id: uuid.UUID,
    data: UserResetPassword,
    db: Session = Depends(get_db),
):
    return user_svc.reset_password(db, user_id, data.new_password)
