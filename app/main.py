
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    APP_NAME,
    APP_VERSION,
    FRONTEND_URL
)

from app.schemas.requests import (
    RouteRequest,
    KickoffRequest,
    TrafficAnalysisRequest,
    SignalPlanRequest,
    SignalReleaseRequest,
    SimulationSignalRequest
)

from app.services.routing_service import calculate_route
from app.services.traffic_service import analyze_traffic
from app.services.signal_service import (
    create_signal_plan,
    release_signal
)

from app.services.simulation_service import (
    start_simulation,
    get_simulation,
    plan_current_signal,
    complete_current_intersection
)


# --------------------------------------------------
# APPLICATION
# --------------------------------------------------

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=(
        "AI service for emergency vehicle routing, "
        "traffic analysis and simulated green corridor control."
    )
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

origins = (
    ["*"]
    if FRONTEND_URL == "*"
    else [
        origin.strip()
        for origin in FRONTEND_URL.split(",")
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "success": True,
        "service": APP_NAME,
        "version": APP_VERSION,
        "message": "Green Corridor AI service is running."
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "status": "healthy",
        "service": "green-corridor-ai"
    }


# --------------------------------------------------
# ROUTE HELPER
# --------------------------------------------------

def get_route_or_error(request):

    try:
        return calculate_route(
            start_lat=request.start_lat,
            start_lon=request.start_lon,
            end_lat=request.end_lat,
            end_lon=request.end_lon
        )

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error)
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Route calculation failed: {str(error)}"
        )


# --------------------------------------------------
# ROUTING
# --------------------------------------------------

@app.post("/route")
def get_route(request: RouteRequest):

    route = get_route_or_error(request)

    return {
        "success": True,
        "route": route
    }


@app.post("/kickoff")
def kickoff(request: KickoffRequest):

    route = get_route_or_error(request)

    return {
        "success": True,
        "message": "Emergency route generated successfully.",
        "route": route,
        "start_time": request.start_time,
        "active_routes_received": len(request.active_routes),
        "mode": "simulation"
    }


# --------------------------------------------------
# TRAFFIC ANALYSIS
# --------------------------------------------------

@app.post("/traffic/analyze")
def traffic_analysis(request: TrafficAnalysisRequest):

    return {
        "success": True,
        "analysis": analyze_traffic(
            request.vehicle_count
        )
    }


# --------------------------------------------------
# SIGNAL PLANNING
# --------------------------------------------------

@app.post("/signal/plan")
def signal_plan(request: SignalPlanRequest):

    plan = create_signal_plan(
        intersection_id=request.intersection_id,
        vehicle_count=request.vehicle_count,
        ambulance_eta_seconds=request.ambulance_eta_seconds,
        crossing_distance_meters=request.crossing_distance_meters,
        ambulance_speed_kmh=request.ambulance_speed_kmh,
        approach_name=request.approach_name
    )

    return {
        "success": True,
        "signal_plan": plan
    }


@app.post("/signal/release")
def signal_release(request: SignalReleaseRequest):

    return {
        "success": True,
        "signal_release": release_signal(
            request.intersection_id
        )
    }


# --------------------------------------------------
# COMPLETE EMERGENCY SIMULATION
# --------------------------------------------------

@app.post("/simulation/start")
def simulation_start(request: RouteRequest):

    route = get_route_or_error(request)

    session = start_simulation(route)

    return {
        "success": True,
        "message": "Emergency vehicle simulation started.",
        "simulation": session,
        "route": route
    }


@app.get("/simulation/{session_id}")
def simulation_status(session_id: str):

    try:
        return {
            "success": True,
            "simulation": get_simulation(session_id)
        }

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )


@app.post("/simulation/{session_id}/signal-plan")
def simulation_signal(
    session_id: str,
    request: SimulationSignalRequest
):

    try:
        plan = plan_current_signal(
            session_id=session_id,
            vehicle_count=request.vehicle_count,
            ambulance_eta_seconds=request.ambulance_eta_seconds,
            crossing_distance_meters=request.crossing_distance_meters,
            ambulance_speed_kmh=request.ambulance_speed_kmh,
            approach_name=request.approach_name
        )

        return {
            "success": True,
            "signal_plan": plan
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


@app.post("/simulation/{session_id}/intersection-cleared")
def simulation_intersection_cleared(session_id: str):

    try:
        result = complete_current_intersection(session_id)

        return {
            "success": True,
            "message": "Intersection cleared.",
            **result
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )
