"""Book a Free Trial: public lead capture + owner-only admin management."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..auth import get_current_admin
from ..db import get_session
from ..models import (
    TRIAL_REQUEST_TRANSITIONS,
    TrialRequest,
    TrialRequestStatus,
    can_transition_trial_request,
)
from ..rate_limit import SlidingWindowRateLimiter, rate_limit
from ..schemas import (
    AdminTrialRequestRead,
    TrialRequestCreate,
    TrialRequestRead,
    TrialRequestStatusUpdate,
)

router = APIRouter(prefix="/trial-requests", tags=["trial-requests"])
admin_router = APIRouter(prefix="/admin/trial-requests", tags=["admin"])

_NOT_FOUND = "Trial request not found"

# 10 submissions per client IP per hour.
trial_request_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60 * 60)


@router.post(
    "",
    response_model=TrialRequestRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(trial_request_limiter, "Too many submissions. Please try again later."))],
)
def create_trial_request(
    payload: TrialRequestCreate,
    session: Session = Depends(get_session),
) -> TrialRequest:
    # Lead capture only: no find-or-create or dedupe, and no link to the students table.
    # Input is already trimmed (and the email lower-cased) by TrialRequestCreate.
    # New rows start "on_trial" (the column default).
    trial_request = TrialRequest(**payload.model_dump())
    session.add(trial_request)
    session.commit()
    session.refresh(trial_request)
    return trial_request


# ── Admin ─────────────────────────────────────────────────────────────────


@admin_router.get("", response_model=list[AdminTrialRequestRead])
def admin_list_trial_requests(
    status_filter: Optional[TrialRequestStatus] = Query(default=None, alias="status"),
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> list[TrialRequest]:
    """All trial requests, newest first (not paginated); optional ?status filter."""
    query = select(TrialRequest).order_by(
        TrialRequest.created_at.desc(), TrialRequest.id.desc()
    )
    if status_filter is not None:
        query = query.where(TrialRequest.status == status_filter.value)
    return session.exec(query).all()


@admin_router.patch("/{trial_request_id}/status", response_model=AdminTrialRequestRead)
def admin_update_trial_request_status(
    trial_request_id: int,
    payload: TrialRequestStatusUpdate,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> TrialRequest:
    trial_request = session.get(TrialRequest, trial_request_id)
    if trial_request is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND)

    current = TrialRequestStatus(trial_request.status)
    target = payload.status

    if not can_transition_trial_request(current, target):
        allowed = TRIAL_REQUEST_TRANSITIONS.get(current, set())
        if allowed:
            why = "a trial request in this status may only move to: " + ", ".join(
                sorted(s.value for s in allowed)
            )
        else:
            why = f"'{current.value}' is a terminal status and cannot be changed"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot change trial request {trial_request_id} status from "
                f"'{current.value}' to '{target.value}': {why}."
            ),
        )

    trial_request.status = target.value
    session.add(trial_request)
    session.commit()
    session.refresh(trial_request)
    return trial_request


@admin_router.delete("/{trial_request_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_trial_request(
    trial_request_id: int,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> None:
    trial_request = session.get(TrialRequest, trial_request_id)
    if trial_request is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND)
    session.delete(trial_request)
    session.commit()
