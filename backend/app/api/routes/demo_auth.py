from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, Response

from app.api.demo_security import DEMO_SESSION_HEADER, get_demo_identity
from app.schemas.demo_auth import (
    DemoProfileView,
    DemoSessionResponse,
    DemoSessionStartRequest,
)
from app.services.demo_sessions import DemoIdentity, DemoSessionStore


router = APIRouter(prefix="/api/v1/demo-auth", tags=["demo-session"])


def _profile_view(identity: DemoIdentity) -> DemoProfileView:
    return DemoProfileView(
        profile_id=identity.profile_id,
        label=identity.label,
        role=identity.role,
        region_label=identity.region_label,
    )


@router.get("/profiles", response_model=list[DemoProfileView])
def list_demo_profiles(request: Request) -> list[DemoProfileView]:
    session_store: DemoSessionStore = request.app.state.demo_sessions
    return [_profile_view(identity) for identity in session_store.profiles()]


@router.post("/session", response_model=DemoSessionResponse)
def start_demo_session(
    request: Request, payload: DemoSessionStartRequest
) -> DemoSessionResponse:
    session_store: DemoSessionStore = request.app.state.demo_sessions
    session_id, identity = session_store.create(payload.profile_id)
    return DemoSessionResponse(
        session_id=session_id,
        expires_in_seconds=session_store.ttl_seconds,
        profile=_profile_view(identity),
    )


@router.get("/session", response_model=DemoProfileView)
def current_demo_session(
    identity: Annotated[DemoIdentity, Depends(get_demo_identity)],
) -> DemoProfileView:
    return _profile_view(identity)


@router.delete("/session", status_code=204)
def end_demo_session(
    request: Request,
    session_id: Annotated[str, Header(alias=DEMO_SESSION_HEADER)],
    identity: Annotated[DemoIdentity, Depends(get_demo_identity)],
) -> Response:
    session_store: DemoSessionStore = request.app.state.demo_sessions
    session_store.revoke(session_id)
    return Response(status_code=204)