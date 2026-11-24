from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..audit import snapshot, write_audit
from ..auth import AdminPrincipal, require_roles
from ..db import get_session
from ..models import ImageAlt
from ..schemas.image_alt import AdminImageAltRead, ImageAltCreate, ImageAltRead, ImageAltWrite
from ..models.student import utcnow

router = APIRouter(tags=["images"])
_editor = require_roles("owner", "seo_editor")
admin_router = APIRouter(prefix="/admin/image-alts", tags=["admin"], dependencies=[Depends(_editor)])


@router.get("/image-alts", response_model=dict[str, ImageAltRead])
def public_image_alts(session: Session = Depends(get_session)) -> dict[str, ImageAltRead]:
    rows = session.exec(select(ImageAlt.image_path, ImageAlt.alt_text, ImageAlt.is_decorative)).all()
    return {path: ImageAltRead(alt_text=text, is_decorative=decorative) for path, text, decorative in rows}


@admin_router.get("", response_model=list[AdminImageAltRead])
def list_image_alts(session: Session = Depends(get_session)) -> list[ImageAlt]:
    return list(session.exec(select(ImageAlt).order_by(ImageAlt.image_path)).all())


@admin_router.post("", status_code=201, response_model=AdminImageAltRead)
def create_image_alt(
    payload: ImageAltCreate,
    request: Request,
    actor: AdminPrincipal = Depends(_editor),
    session: Session = Depends(get_session),
) -> AdminImageAltRead:
    row = ImageAlt.model_validate(payload)
    session.add(row)
    try:
        session.flush()
    except IntegrityError as exc:
        session.rollback()
        if getattr(getattr(exc.orig, "diag", None), "constraint_name", None) == "uq_image_alts_image_path":
            raise HTTPException(status_code=409, detail="This image path already has an override.") from exc
        raise
    write_audit(session, actor, "image_alt.create", "image_alt", str(row.id), after=snapshot(row), request=request)
    result = AdminImageAltRead.model_validate(row)
    session.commit()
    return result


def _locked_image_alt(session: Session, image_alt_id: int) -> ImageAlt:
    row = session.get(ImageAlt, image_alt_id, with_for_update=True)
    if row is None:
        raise HTTPException(status_code=404, detail="Image alt override not found.")
    return row


@admin_router.put("/{image_alt_id}", response_model=AdminImageAltRead)
def update_image_alt(
    image_alt_id: int,
    payload: ImageAltWrite,
    request: Request,
    actor: AdminPrincipal = Depends(_editor),
    session: Session = Depends(get_session),
) -> AdminImageAltRead:
    row = _locked_image_alt(session, image_alt_id)
    before = snapshot(row)
    row.sqlmodel_update(payload.model_dump())
    row.updated_at = utcnow()
    write_audit(session, actor, "image_alt.update", "image_alt", str(row.id), before, snapshot(row), request)
    result = AdminImageAltRead.model_validate(row)
    session.commit()
    return result


@admin_router.delete("/{image_alt_id}", status_code=204)
def delete_image_alt(
    image_alt_id: int,
    request: Request,
    actor: AdminPrincipal = Depends(_editor),
    session: Session = Depends(get_session),
) -> Response:
    row = _locked_image_alt(session, image_alt_id)
    write_audit(session, actor, "image_alt.delete", "image_alt", str(row.id), before=snapshot(row), request=request)
    session.delete(row)
    session.commit()
    return Response(status_code=204)
