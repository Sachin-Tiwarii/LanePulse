import math

import osmnx as ox

from app.config import GRAPH_PATH, MAX_SNAP_DISTANCE_METERS


_graph = None


def get_graph():
    global _graph

    if _graph is None:
        if not GRAPH_PATH.exists():
            raise FileNotFoundError(
                "Indore road graph not found. "
                "Run: python -m scripts.build_indore_graph"
            )

        print("Loading Indore road network...")

        _graph = ox.load_graphml(GRAPH_PATH)

        print("Road network loaded.")

    return _graph


def haversine_distance(lat1, lon1, lat2, lon2):
    radius = 6371000

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)

    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    return radius * 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )


def find_nearest_node(latitude, longitude):
    graph = get_graph()

    node = ox.distance.nearest_nodes(
        graph,
        X=longitude,
        Y=latitude
    )

    node_data = graph.nodes[node]

    distance = haversine_distance(
        latitude,
        longitude,
        node_data["y"],
        node_data["x"]
    )

    if distance > MAX_SNAP_DISTANCE_METERS:
        raise ValueError(
            "Location is outside the supported road network. "
            "Choose a location within the Indore demo area."
        )

    return node