from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from ..db import get_session
from ..models import TrialRequest
from ..schemas import TrialRequestCreate, TrialRequestRead

router = APIRouter(prefix="/trial-requests", tags=["trial-requests"])


@router.post("", response_model=TrialRequestRead, status_code=status.HTTP_201_CREATED)
def create_trial_request(
    payload: TrialRequestCreate,
    session: Session = Depends(get_session),
) -> TrialRequest:
    # Lead capture only: no find-or-create or dedupe, and no link to the students table.
    # Input is already trimmed (and the email lower-cased) by TrialRequestCreate.
    trial_request = TrialRequest(**payload.model_dump())
    session.add(trial_request)
    session.commit()
    session.refresh(trial_request)
    return trial_request
