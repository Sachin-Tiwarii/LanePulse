import math

from app.services.traffic_service import analyze_traffic


def create_signal_plan(
    intersection_id: str,
    vehicle_count: int,
    ambulance_eta_seconds: float,
    crossing_distance_meters: float,
    ambulance_speed_kmh: float,
    approach_name: str
):
    traffic = analyze_traffic(vehicle_count)

    density = traffic["density"]

    density_buffer = {
        "low": 0,
        "medium": 5,
        "high": 10
    }[density]

    speed_meters_per_second = (
        ambulance_speed_kmh / 3.6
    )

    crossing_time = (
        crossing_distance_meters
        / speed_meters_per_second
    )

    # Illustrative simulator heuristic, not a certified
    # real-world traffic signal timing algorithm.
    green_seconds = (
        crossing_time
        + 8
        + density_buffer
        + min(vehicle_count * 0.15, 10)
    )

    green_seconds = max(
        15,
        min(45, math.ceil(green_seconds))
    )

    return {
        "intersection_id": intersection_id,
        "traffic_analysis": traffic,
        "ambulance_eta_seconds": round(
            ambulance_eta_seconds, 2
        ),
        "signal_sequence": [
            {
                "phase": "yellow_clearance",
                "duration_seconds": 3,
                "description": "Prepare conflicting traffic to stop"
            },
            {
                "phase": "all_red",
                "duration_seconds": 2,
                "description": "All approaches remain red before preemption"
            },
            {
                "phase": "emergency_green",
                "duration_seconds": green_seconds,
                "description": "Emergency vehicle approach gets green"
            },
            {
                "phase": "restore_normal",
                "duration_seconds": 0,
                "description": "Resume normal signal cycle after clearance"
            }
        ],
        "emergency_approach": {
            "name": approach_name,
            "signal": "GREEN"
        },
        "conflicting_approaches": {
            "signal": "RED"
        },
        "recommended_green_seconds": green_seconds,
        "status": "preemption_planned",
        "mode": "simulation_only"
    }


def release_signal(intersection_id: str):
    return {
        "intersection_id": intersection_id,
        "status": "normal_cycle_restored",
        "signals": {
            "emergency_approach": "NORMAL_CYCLE",
            "other_approaches": "NORMAL_CYCLE"
        },
        "message": (
            "Emergency vehicle has cleared the intersection. "
            "Normal simulated signal operation can resume."
        ),
        "mode": "simulation_only"
    }