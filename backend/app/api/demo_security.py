from typing import Annotated

from fastapi import Header, HTTPException, Request

from app.services.demo_sessions import DemoIdentity, DemoSessionStore


DEMO_SESSION_HEADER = "X-Demo-Session"


def get_demo_identity(
    request: Request,
    session_id: Annotated[str | None, Header(alias=DEMO_SESSION_HEADER)] = None,
) -> DemoIdentity:
    session_store: DemoSessionStore = request.app.state.demo_sessions
    if not session_id:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "demo_session_required",
                "message": f"Envie uma sessão válida no cabeçalho {DEMO_SESSION_HEADER}.",
            },
        )

    identity = session_store.resolve(session_id)
    if identity is None:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "demo_session_invalid",
                "message": "A sessão Demo é inválida, expirada ou foi encerrada.",
            },
        )
    return identity