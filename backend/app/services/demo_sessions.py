import secrets
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass

from app.schemas.demo_auth import DemoProfileId


@dataclass(frozen=True)
class DemoIdentity:
    profile_id: DemoProfileId
    label: str
    role: str
    allowed_regions: tuple[str, ...] | None

    @property
    def region_label(self) -> str:
        if self.allowed_regions is None:
            return "Todas as regiões"
        return ", ".join(self.allowed_regions)


@dataclass(frozen=True)
class _ActiveSession:
    identity: DemoIdentity
    expires_at: float


DEMO_PROFILES: dict[DemoProfileId, DemoIdentity] = {
    "analyst_south": DemoIdentity(
        profile_id="analyst_south",
        label="Analista — Sul",
        role="analyst",
        allowed_regions=("Sul",),
    ),
    "manager_south": DemoIdentity(
        profile_id="manager_south",
        label="Gerente — Sul",
        role="manager",
        allowed_regions=("Sul",),
    ),
    "manager_southeast": DemoIdentity(
        profile_id="manager_southeast",
        label="Gerente — Sudeste",
        role="manager",
        allowed_regions=("Sudeste",),
    ),
    "director_all": DemoIdentity(
        profile_id="director_all",
        label="Diretor — todas as regiões",
        role="director",
        allowed_regions=None,
    ),
}


class DemoSessionStore:
    def __init__(
        self,
        ttl_seconds: int = 3600,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds deve ser maior que zero")
        self.ttl_seconds = ttl_seconds
        self._clock = clock
        self._sessions: dict[str, _ActiveSession] = {}
        self._lock = threading.RLock()

    @staticmethod
    def profiles() -> tuple[DemoIdentity, ...]:
        return tuple(DEMO_PROFILES.values())

    def create(self, profile_id: DemoProfileId) -> tuple[str, DemoIdentity]:
        identity = DEMO_PROFILES[profile_id]
        session_id = secrets.token_urlsafe(32)
        expires_at = self._clock() + self.ttl_seconds
        with self._lock:
            self._sessions[session_id] = _ActiveSession(identity, expires_at)
        return session_id, identity

    def resolve(self, session_id: str | None) -> DemoIdentity | None:
        if not session_id:
            return None

        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            if self._clock() >= session.expires_at:
                del self._sessions[session_id]
                return None
            return session.identity

    def revoke(self, session_id: str) -> bool:
        with self._lock:
            return self._sessions.pop(session_id, None) is not None