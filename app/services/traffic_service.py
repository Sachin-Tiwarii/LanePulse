def analyze_traffic(vehicle_count: int):
    if vehicle_count <= 5:
        density = "low"
        congestion_index = 20

    elif vehicle_count <= 15:
        density = "medium"
        congestion_index = 55

    else:
        density = "high"
        congestion_index = 85

    return {
        "vehicle_count": vehicle_count,
        "density": density,
        "congestion_index": congestion_index,
        "source": "frontend_vehicle_detection",
        "is_simulated": True
    }