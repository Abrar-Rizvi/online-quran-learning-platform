from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import CoursePlan
from ..schemas import FeePlanRead

router = APIRouter(prefix="/fees", tags=["fees"])


@router.get("", response_model=list[FeePlanRead])
def list_fees(session: Session = Depends(get_session)) -> list[FeePlanRead]:
    rows = session.exec(select(CoursePlan).order_by(CoursePlan.id)).all()
    return list(rows)
