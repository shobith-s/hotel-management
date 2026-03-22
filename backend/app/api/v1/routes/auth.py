from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import create_access_token, get_current_user, oauth2_scheme, revoke_token
from app.schemas.user import LoginRequest, Token, UserRead
from app.services import user as user_svc

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    user = user_svc.authenticate_user(db, data.email, data.password)
    return Token(access_token=create_access_token(user.id, user.role))


@router.post("/logout", status_code=204)
def logout(token: str = Depends(oauth2_scheme)):
    revoke_token(token)


@router.get("/me", response_model=UserRead)
def me(current_user=Depends(get_current_user)):
    return current_user
