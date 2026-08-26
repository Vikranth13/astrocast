from pydantic import BaseModel, Field


class NoaaSolarWindRecord(BaseModel):
    time_tag: str = Field(
        min_length=1,
    )

    active: bool

    source: str = Field(
        min_length=1,
    )

    proton_speed: float | None = None

    proton_temperature: float | None = None

    proton_density: float | None = None