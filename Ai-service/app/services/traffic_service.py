import math
import random


def analyze_traffic(vehicle_count: int):
    vehicle_count = max(0, int(vehicle_count))
    if vehicle_count <= 8:
        density, index, speed = "low", 20, 42
    elif vehicle_count <= 20:
        density, index, speed = "medium", 55, 28
    else:
        density, index, speed = "high", 85, 14
    return {
        "vehicle_count": vehicle_count,
        "density": density,
        "congestion_index": index,
        "estimated_road_speed_kmh": speed,
        "source": "algorithmically_generated_demo_traffic",
        "is_simulated": True,
    }


def generate_traffic_snapshot(seed, elapsed_seconds, segment_count):
    """Generate reproducible, time-varying traffic for a demonstration."""
    rng = random.Random(int(seed) + int(elapsed_seconds // 5))
    phase = (elapsed_seconds / 22.0) + (seed % 17)
    profiles = []
    speeds = []
    total_vehicles = 0
    segment_count = max(1, min(5, int(segment_count or 1)))
    for index in range(segment_count):
        wave = math.sin(phase + index * 1.37)
        rush_factor = 1.0 + 0.28 * math.sin(elapsed_seconds / 45.0 + index)
        count = max(2, min(48, int((15 + wave * 10) * rush_factor + rng.randint(-3, 3))))
        analysis = analyze_traffic(count)
        speed = max(10, min(48, analysis["estimated_road_speed_kmh"] + rng.randint(-4, 4)))
        profiles.append({
            "segment": index + 1,
            "vehicle_count": count,
            "density": analysis["density"],
            "congestion_index": analysis["congestion_index"],
            "average_speed_kmh": speed,
        })
        speeds.append(speed)
        total_vehicles += count
    average_speed = sum(speeds) / len(speeds)
    all_counts = [p["vehicle_count"] for p in profiles]
    overall_density = "high" if max(all_counts) > 20 else ("medium" if max(all_counts) > 8 else "low")
    return {
        "vehicle_count": total_vehicles,
        "density": overall_density,
        "congestion_index": round(sum(p["congestion_index"] for p in profiles) / len(profiles)),
        "average_speed_kmh": round(average_speed, 1),
        "segments": profiles,
        "source": "algorithmically_generated_demo_traffic",
        "is_simulated": True,
        "updated_at_elapsed_seconds": round(elapsed_seconds, 1),
    }
