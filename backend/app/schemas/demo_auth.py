from typing import Literal

from pydantic import BaseModel


DemoProfileId = Literal[
    "analyst_south",
    "manager_south",
    "manager_southeast",
    "director_all",
    "data_engineer_all",
]


class DemoProfileView(BaseModel):
    profile_id: DemoProfileId
    label: str
    role: Literal["analyst", "manager", "director", "data_engineer"]
    region_label: str


class DemoSessionStartRequest(BaseModel):
    profile_id: DemoProfileId


class DemoSessionResponse(BaseModel):
    session_id: str
    expires_in_seconds: int
    profile: DemoProfileView
