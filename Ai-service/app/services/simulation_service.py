import time
import math
import random
from uuid import uuid4

from app.services.signal_service import create_signal_plan, release_signal
from app.services.traffic_service import generate_traffic_snapshot

_simulations = {}

SECONDS_PER_ROUTE_MINUTE = 10
MIN_SIMULATION_SECONDS = 45
MAX_SIMULATION_SECONDS = 240


def calculate_distance(point_a, point_b):
    lat1, lon1 = map(math.radians, point_a)
    lat2, lon2 = map(math.radians, point_b)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371000 * 2 * math.atan2(math.sqrt(value), math.sqrt(max(0, 1 - value)))


def route_metrics(coords):
    segments, total = [], 0.0
    for i in range(len(coords) - 1):
        d = calculate_distance(coords[i], coords[i + 1])
        segments.append(d)
        total += d
    return segments, total


def position_at_distance(coords, segments, target):
    if not coords:
        return None
    travelled = 0.0
    for i, length in enumerate(segments):
        if travelled + length >= target:
            ratio = (target - travelled) / length if length else 0
            return [
                coords[i][0] + (coords[i + 1][0] - coords[i][0]) * ratio,
                coords[i][1] + (coords[i + 1][1] - coords[i][1]) * ratio,
            ]
        travelled += length
    return list(coords[-1])


def distance_along_route(coords, segments, target_point):
    best_distance, best_gap = 0.0, float("inf")
    travelled = 0.0
    for i, length in enumerate(segments):
        a, b = coords[i], coords[i + 1]
        # Local planar projection is adequate for locating a point on this short demo route.
        lat_scale = 111_000
        lon_scale = 111_000 * math.cos(math.radians(target_point[0]))
        ax, ay = (a[1] - target_point[1]) * lon_scale, (a[0] - target_point[0]) * lat_scale
        bx, by = (b[1] - target_point[1]) * lon_scale, (b[0] - target_point[0]) * lat_scale
        dx, dy = bx - ax, by - ay
        denom = dx * dx + dy * dy
        t = max(0.0, min(1.0, -(ax * dx + ay * dy) / denom)) if denom else 0.0
        gap = math.hypot(ax + t * dx, ay + t * dy)
        if gap < best_gap:
            best_gap = gap
            best_distance = travelled + length * t
        travelled += length
    return best_distance


def choose_priority_intersections(intersections, total_distance, coords, segments):
    if not intersections or total_distance <= 0:
        return []
    # Select 2-3 representative intersections distributed across the route.
    count = min(3, max(2, round(total_distance / 1800))) if len(intersections) >= 2 else 1
    indexed = []
    for item in intersections:
        point = [float(item["latitude"]), float(item["longitude"])]
        indexed.append((distance_along_route(coords, segments, point), item))
    indexed.sort(key=lambda pair: pair[0])
    selected = []
    for slot in range(count):
        target = total_distance * (slot + 1) / (count + 1)
        candidate = min(indexed, key=lambda pair: abs(pair[0] - target))
        if candidate not in selected:
            selected.append(candidate)
    if len(selected) < count:
        for candidate in indexed:
            if candidate not in selected:
                selected.append(candidate)
            if len(selected) >= count:
                break
    selected.sort(key=lambda pair: pair[0])
    output = []
    for order, (distance, item) in enumerate(selected, start=1):
        output.append({
            **item,
            "priority_order": order,
            "distance_from_start_meters": round(distance, 1),
        })
    return output


def refresh_simulation(session):
    now = time.time()
    elapsed = max(0, now - session["started_at"])
    progress = min(100.0, elapsed / session["duration_seconds"] * 100)
    session["progress"] = round(progress, 2)
    session["travelled_meters"] = session["total_distance"] * progress / 100
    if progress >= 100:
        session["status"] = "completed"
        session["progress"] = 100.0
        session["travelled_meters"] = session["total_distance"]
    return session


def traffic_for_session(session):
    elapsed = time.time() - session["started_at"]
    return generate_traffic_snapshot(
        session["traffic_seed"],
        elapsed,
        session["route_segments"],
    )


def get_simulation(session_id):
    session = _simulations.get(session_id)
    if not session:
        raise ValueError("Simulation session not found.")
    refresh_simulation(session)

    travelled = session["travelled_meters"]
    remaining = max(0.0, session["total_distance"] - travelled)
    position = position_at_distance(
        session["route_coordinates"], session["segment_distances"], travelled
    )
    traffic = traffic_for_session(session)
    average_speed = max(8.0, traffic["average_speed_kmh"])
    destination_eta = remaining / 1000 / average_speed * 3600

    signals = []
    next_signal = None
    for signal in session["priority_intersections"]:
        distance = signal["distance_from_start_meters"] - travelled
        if distance < -35:
            state = "NORMAL_CYCLE"
            lifecycle = "restored"
        elif distance <= 120:
            state = "GREEN"
            lifecycle = "priority_green"
        elif distance <= 350:
            state = "PREPARE"
            lifecycle = "preparing"
        else:
            state = "NORMAL_CYCLE"
            lifecycle = "waiting"
        item = {
            **signal,
            "distance_remaining_meters": round(max(0, distance), 1),
            "eta_seconds": round(max(0, distance) / (average_speed / 3.6), 1),
            "signal_state": state,
            "lifecycle": lifecycle,
            "traffic": traffic["segments"][(signal["priority_order"] - 1) % len(traffic["segments"])],
        }
        signals.append(item)
        if next_signal is None and distance >= -35:
            next_signal = item

    if session["status"] == "completed":
        signals = [{**s, "signal_state": "NORMAL_CYCLE", "lifecycle": "restored"} for s in signals]
        next_signal = None

    return {
        "session_id": session_id,
        "status": session["status"],
        "progress": session["progress"],
        "current_position": position,
        "distance_travelled_meters": round(travelled, 1),
        "distance_remaining_meters": round(remaining, 1),
        "destination_eta_seconds": round(destination_eta, 1),
        "destination_eta_minutes": round(destination_eta / 60, 1),
        "total_intersections": len(session["intersections"]),
        "priority_intersections": signals,
        "priority_signal_count": len(signals),
        "crossed_intersections": sum(1 for s in signals if s["lifecycle"] == "restored"),
        "remaining_intersections": sum(1 for s in signals if s["lifecycle"] != "restored"),
        "next_intersection": next_signal,
        "traffic": traffic,
        "destination_reached": session["status"] == "completed",
        "duration_seconds": round(session["duration_seconds"], 1),
        "elapsed_seconds": round(min(time.time() - session["started_at"], session["duration_seconds"]), 1),
        "simulation_source": "algorithmically_generated_demo_traffic",
    }


def start_simulation(route):
    coords = route.get("route_coordinates") or []
    if len(coords) < 2:
        raise ValueError("A valid road route is required to start simulation.")
    segment_distances, total_distance = route_metrics(coords)
    if total_distance <= 0:
        raise ValueError("Route distance must be greater than zero.")

    intersections = route.get("intersections") or []
    priority_intersections = choose_priority_intersections(
        intersections, total_distance, coords, segment_distances
    )
    estimated_minutes = float(route.get("estimated_duration_minutes") or 1)
    duration = max(MIN_SIMULATION_SECONDS, min(MAX_SIMULATION_SECONDS, estimated_minutes * SECONDS_PER_ROUTE_MINUTE))
    session_id = str(uuid4())
    _simulations[session_id] = {
        "session_id": session_id,
        "route": route,
        "route_coordinates": coords,
        "route_segments": len(segment_distances),
        "segment_distances": segment_distances,
        "total_distance": total_distance,
        "intersections": intersections,
        "priority_intersections": priority_intersections,
        "traffic_seed": random.randint(1, 1_000_000),
        "progress": 0.0,
        "travelled_meters": 0.0,
        "status": "in_progress",
        "started_at": time.time(),
        "duration_seconds": duration,
    }
    return get_simulation(session_id)


def plan_current_signal(session_id, vehicle_count=0, ambulance_eta_seconds=5,
                        crossing_distance_meters=25, ambulance_speed_kmh=20,
                        approach_name="Emergency vehicle approach"):
    simulation = get_simulation(session_id)
    intersection = simulation["next_intersection"]
    if not intersection:
        raise ValueError("There are no remaining priority intersections.")
    count = vehicle_count or intersection["traffic"]["vehicle_count"]
    return create_signal_plan(
        intersection_id=intersection["intersection_id"],
        vehicle_count=count,
        ambulance_eta_seconds=intersection["eta_seconds"],
        crossing_distance_meters=crossing_distance_meters,
        ambulance_speed_kmh=ambulance_speed_kmh,
        approach_name=approach_name,
    )


def complete_current_intersection(session_id):
    simulation = get_simulation(session_id)
    intersection = simulation["next_intersection"]
    if not intersection:
        raise ValueError("No remaining priority intersection to clear.")
    return {
        "signal_release": release_signal(intersection["intersection_id"]),
        "simulation": simulation,
        "message": "Signal returned to its normal simulated cycle.",
    }
