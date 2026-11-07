from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    start_lat: float = Field(ge=-90, le=90)
    start_lon: float = Field(ge=-180, le=180)

    end_lat: float = Field(ge=-90, le=90)
    end_lon: float = Field(ge=-180, le=180)


class KickoffRequest(RouteRequest):
    start_time: str | None = None
    active_routes: list[dict] = Field(default_factory=list)


class TrafficAnalysisRequest(BaseModel):
    vehicle_count: int = Field(ge=0, le=500)


class SignalPlanRequest(BaseModel):
    intersection_id: str

    vehicle_count: int = Field(ge=0, le=500)

    ambulance_eta_seconds: float = Field(
        default=5,
        ge=0,
        le=300
    )

    crossing_distance_meters: float = Field(
        default=25,
        ge=5,
        le=150
    )

    ambulance_speed_kmh: float = Field(
        default=20,
        ge=5,
        le=80
    )

    approach_name: str = "Emergency vehicle approach"


class SignalReleaseRequest(BaseModel):
    intersection_id: str


class SimulationSignalRequest(BaseModel):
    vehicle_count: int = Field(ge=0, le=500)

    ambulance_eta_seconds: float = Field(
        default=5,
        ge=0,
        le=300
    )

    crossing_distance_meters: float = Field(
        default=25,
        ge=5,
        le=150
    )

    ambulance_speed_kmh: float = Field(
        default=20,
        ge=5,
        le=80
    )

    approach_name: str = "Emergency vehicle approach"