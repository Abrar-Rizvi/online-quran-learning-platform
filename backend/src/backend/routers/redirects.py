from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from ..audit import snapshot, write_audit
from ..auth import AdminPrincipal, get_current_admin, require_roles
from ..db import get_session
from ..models import Redirect
from ..redirects import add_redirect, lock_redirects
from ..schemas.redirect import PublicRedirect, RedirectCreate, RedirectRead

router = APIRouter(tags=["redirects"])
admin_router = APIRouter(
    prefix="/admin/redirects",
    tags=["admin"],
    dependencies=[Depends(require_roles("owner", "seo_editor"))],
)


@router.get("/redirects", response_model=list[PublicRedirect])
def list_public_redirects(session: Session = Depends(get_session)) -> list[PublicRedirect]:
    rows = session.exec(select(Redirect.from_path, Redirect.to_path)).all()
    return [PublicRedirect(from_path=source, to_path=target) for source, target in rows]


@admin_router.get("", response_model=list[RedirectRead])
def list_redirects(session: Session = Depends(get_session)) -> list[Redirect]:
    return list(session.exec(select(Redirect).order_by(Redirect.id.desc())).all())


@admin_router.post("", response_model=RedirectRead, status_code=status.HTTP_201_CREATED)
def create_redirect(
    payload: RedirectCreate,
    request: Request,
    principal: AdminPrincipal = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> Redirect:
    result = add_redirect(session, payload.from_path, payload.to_path, principal.name)
    redirect = result.redirect
    write_audit(
        session, principal, "redirect.create", "redirect", str(redirect.id),
        None, snapshot(redirect), request,
    )
    for row, previous_target in result.retargeted:
        after = snapshot(row)
        write_audit(
            session, principal, "redirect.update", "redirect", str(row.id),
            {**after, "to_path": previous_target}, after, request,
        )
    session.commit()
    session.refresh(redirect)
    return redirect


@admin_router.delete("/{redirect_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_redirect(
    redirect_id: int,
    request: Request,
    principal: AdminPrincipal = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> None:
    lock_redirects(session)
    redirect = session.get(Redirect, redirect_id)
    if redirect is None:
        raise HTTPException(status_code=404, detail="Redirect not found.")

    write_audit(
        session, principal, "redirect.delete", "redirect", str(redirect.id),
        snapshot(redirect), None, request,
    )
    session.delete(redirect)
    session.commit()
