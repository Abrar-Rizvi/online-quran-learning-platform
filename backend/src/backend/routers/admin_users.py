"""Owner-only admin-user management (list / create / update).

There is no delete endpoint: users are deactivated with ``is_active=false``
instead, so past audit rows keep a valid ``actor_user_id`` reference.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..audit import snapshot, write_audit
from ..auth import AdminPrincipal, get_current_admin, require_roles
from ..db import get_session
from ..models import AdminRole, AdminUser
from ..security import hash_password
from ..schemas.admin_user import AdminUserCreate, AdminUserRead, AdminUserUpdate

router = APIRouter(
    prefix="/admin/users",
    tags=["admin"],
    dependencies=[Depends(require_roles("owner"))],
)

_DUPLICATE = "An admin user with email '{email}' already exists."


@router.get("", response_model=list[AdminUserRead])
def list_admin_users(
    session: Session = Depends(get_session),
) -> list[AdminUser]:
    return session.exec(select(AdminUser).order_by(AdminUser.id)).all()


@router.post("", response_model=AdminUserRead, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    payload: AdminUserCreate,
    request: Request,
    principal: AdminPrincipal = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> AdminUser:
    # The role is hard-coded to seo_editor: this API can never create an owner.
    existing = session.exec(
        select(AdminUser).where(AdminUser.email == payload.email)
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_DUPLICATE.format(email=payload.email),
        )

    user = AdminUser(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=AdminRole.SEO_EDITOR.value,
        is_active=True,
    )
    session.add(user)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_DUPLICATE.format(email=payload.email),
        )

    write_audit(
        session,
        principal,
        "admin_user.create",
        "admin_user",
        str(user.id),
        None,
        snapshot(user),
        request,
    )
    session.commit()
    session.refresh(user)
    return user


@router.patch("/{user_id}", response_model=AdminUserRead)
def update_admin_user(
    user_id: int,
    payload: AdminUserUpdate,
    request: Request,
    principal: AdminPrincipal = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> AdminUser:
    user = session.get(AdminUser, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found")

    updates = payload.model_dump(exclude_unset=True)

    password_reset = False
    if "password" in updates:
        if updates["password"] is None:
            updates.pop("password")
        else:
            password_reset = True

    if "name" in updates and updates["name"] is None:
        raise HTTPException(status_code=422, detail="name cannot be null")
    if "is_active" in updates and updates["is_active"] is None:
        raise HTTPException(status_code=422, detail="is_active cannot be null")

    before = snapshot(user)

    if password_reset:
        user.password_hash = hash_password(updates.pop("password"))
    if updates:
        user.sqlmodel_update(updates)

    after = snapshot(user)
    if password_reset:
        # Record only a marker, never the new password or its hash.
        after["password"] = "reset"

    write_audit(
        session,
        principal,
        "admin_user.update",
        "admin_user",
        str(user.id),
        before,
        after,
        request,
    )
    session.commit()
    session.refresh(user)
    return user
