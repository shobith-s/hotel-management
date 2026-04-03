import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.enums import UserRole
from typing import List

from app.schemas.billing import BillCreate, BillRead, BillSplitRead, PaymentRequest, SplitRequest
from app.services import billing as billing_svc

router = APIRouter(prefix="/billing", tags=["Billing"])

_all_staff = Depends(get_current_user)
_admin_manager = Depends(require_roles(UserRole.admin, UserRole.manager))


@router.post("/", response_model=BillRead)
def create_bill(
    data: BillCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return billing_svc.create_bill(db, data, current_user.id)


# Static paths must come before /{bill_id} to avoid route conflicts
@router.get("/order/{order_id}", response_model=BillRead, dependencies=[_all_staff])
def get_bill_by_order(order_id: uuid.UUID, db: Session = Depends(get_db)):
    return billing_svc.get_bill_by_order(db, order_id)


@router.get("/{bill_id}", response_model=BillRead, dependencies=[_all_staff])
def get_bill(bill_id: uuid.UUID, db: Session = Depends(get_db)):
    return billing_svc.get_bill(db, bill_id)


@router.post("/{bill_id}/pay", response_model=BillRead, dependencies=[_all_staff])
def settle_payment(bill_id: uuid.UUID, data: PaymentRequest, db: Session = Depends(get_db)):
    return billing_svc.settle_payment(db, bill_id, data)



@router.post("/{bill_id}/split", response_model=List[BillSplitRead], dependencies=[_all_staff])
def split_bill(bill_id: uuid.UUID, data: SplitRequest, db: Session = Depends(get_db)):
    return billing_svc.split_bill(db, bill_id, data.splits)


@router.get("/{bill_id}/splits", response_model=List[BillSplitRead], dependencies=[_all_staff])
def get_splits(bill_id: uuid.UUID, db: Session = Depends(get_db)):
    bill = billing_svc.get_bill(db, bill_id)
    return bill.splits


@router.post("/splits/{split_id}/pay", response_model=BillSplitRead, dependencies=[_all_staff])
def settle_split(split_id: uuid.UUID, data: PaymentRequest, db: Session = Depends(get_db)):
    return billing_svc.settle_split(db, split_id, data.payment_mode)
