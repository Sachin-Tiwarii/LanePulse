
from uuid import uuid4

from app.services.signal_service import (
    create_signal_plan,
    release_signal
)


# In-memory simulation sessions.
# Sessions reset when the service restarts.
_simulations = {}


def start_simulation(route):
    session_id = str(uuid4())

    intersections = route.get("intersections", [])

    _simulations[session_id] = {
        "session_id": session_id,
        "route": route,
        "intersections": intersections,
        "current_index": 0,
        "status": "in_progress"
    }

    return get_simulation(session_id)


def get_simulation(session_id):
    session = _simulations.get(session_id)

    if not session:
        raise ValueError("Simulation session not found.")

    index = session["current_index"]
    intersections = session["intersections"]

    next_intersection = (
        intersections[index]
        if index < len(intersections)
        else None
    )

    return {
        "session_id": session_id,
        "status": session["status"],
        "total_intersections": len(intersections),
        "crossed_intersections": index,
        "remaining_intersections": len(intersections) - index,
        "next_intersection": next_intersection,
        "destination_reached": session["status"] == "completed"
    }


def plan_current_signal(
    session_id,
    vehicle_count,
    ambulance_eta_seconds,
    crossing_distance_meters,
    ambulance_speed_kmh,
    approach_name
):
    session = _simulations.get(session_id)

    if not session:
        raise ValueError("Simulation session not found.")

    if session["status"] != "in_progress":
        raise ValueError("Simulation is not active.")

    index = session["current_index"]
    intersections = session["intersections"]

    if index >= len(intersections):
        raise ValueError("There are no remaining intersections.")

    intersection = intersections[index]

    return create_signal_plan(
        intersection_id=intersection["intersection_id"],
        vehicle_count=vehicle_count,
        ambulance_eta_seconds=ambulance_eta_seconds,
        crossing_distance_meters=crossing_distance_meters,
        ambulance_speed_kmh=ambulance_speed_kmh,
        approach_name=approach_name
    )


def complete_current_intersection(session_id):
    session = _simulations.get(session_id)

    if not session:
        raise ValueError("Simulation session not found.")

    if session["status"] != "in_progress":
        raise ValueError("Simulation is not active.")

    index = session["current_index"]
    intersections = session["intersections"]

    if index >= len(intersections):
        raise ValueError("No remaining intersection to clear.")

    cleared_intersection = intersections[index]

    # Restore the normal simulated signal cycle.
    signal_restoration = release_signal(
        cleared_intersection["intersection_id"]
    )

    # Move to the next intersection.
    session["current_index"] += 1

    if session["current_index"] >= len(intersections):
        session["status"] = "completed"

    return {
        "signal_release": signal_restoration,
        "simulation": get_simulation(session_id)
    }
