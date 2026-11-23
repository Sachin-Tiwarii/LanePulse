import networkx as nx

from app.config import AVERAGE_SPEED_KMH
from app.services.graph_service import (
    get_graph,
    find_nearest_node
)


def get_route_geometry(graph, route_nodes):
    coordinates = []

    for index in range(len(route_nodes) - 1):
        start_node = route_nodes[index]
        end_node = route_nodes[index + 1]

        start_data = graph.nodes[start_node]
        end_data = graph.nodes[end_node]

        start_coordinate = [
            start_data["y"],
            start_data["x"]
        ]

        end_coordinate = [
            end_data["y"],
            end_data["x"]
        ]

        edge_options = graph.get_edge_data(
            start_node,
            end_node
        )

        if not edge_options:
            segment = [start_coordinate, end_coordinate]
        else:
            best_edge = min(
                edge_options.values(),
                key=lambda edge: edge.get("length", float("inf"))
            )

            geometry = best_edge.get("geometry")

            if geometry is not None:
                points = list(geometry.coords)

                # Shapely geometry coordinates are longitude, latitude.
                first_point = [points[0][1], points[0][0]]
                last_point = [points[-1][1], points[-1][0]]

                # Ensure the geometry follows the route direction.
                if (
                    abs(first_point[0] - start_coordinate[0])
                    + abs(first_point[1] - start_coordinate[1])
                    >
                    abs(last_point[0] - start_coordinate[0])
                    + abs(last_point[1] - start_coordinate[1])
                ):
                    points.reverse()

                segment = [
                    [point[1], point[0]]
                    for point in points
                ]
            else:
                segment = [start_coordinate, end_coordinate]

        if coordinates:
            coordinates.extend(segment[1:])
        else:
            coordinates.extend(segment)

    if len(route_nodes) == 1:
        node = graph.nodes[route_nodes[0]]
        coordinates = [[node["y"], node["x"]]]

    return coordinates


def get_intersections(graph, route_nodes):
    undirected_graph = graph.to_undirected()

    intersections = []

    for index, node in enumerate(route_nodes[1:-1], start=1):
        degree = undirected_graph.degree(node)

        if degree >= 3:
            node_data = graph.nodes[node]

            intersections.append({
                "intersection_id": str(node),
                "route_order": len(intersections) + 1,
                "latitude": node_data["y"],
                "longitude": node_data["x"],
                "road_connections": degree
            })

    return intersections


def calculate_route(
    start_lat,
    start_lon,
    end_lat,
    end_lon
):
    graph = get_graph()

    start_node = find_nearest_node(
        start_lat,
        start_lon
    )

    end_node = find_nearest_node(
        end_lat,
        end_lon
    )

    try:
        route_nodes = nx.shortest_path(
            graph,
            source=start_node,
            target=end_node,
            weight="length",
            method="dijkstra"
        )

        distance_meters = nx.shortest_path_length(
            graph,
            source=start_node,
            target=end_node,
            weight="length"
        )

    except nx.NetworkXNoPath:
        raise ValueError(
            "No road route found between these locations."
        )

    coordinates = get_route_geometry(
        graph,
        route_nodes
    )

    intersections = get_intersections(
        graph,
        route_nodes
    )

    estimated_duration_seconds = (
        distance_meters / 1000
    ) / AVERAGE_SPEED_KMH * 3600

    return {
        "distance_meters": round(distance_meters, 2),
        "distance_km": round(distance_meters / 1000, 2),
        "estimated_duration_seconds": round(
            estimated_duration_seconds
        ),
        "estimated_duration_minutes": round(
            estimated_duration_seconds / 60, 2
        ),
        "route_coordinates": coordinates,
        "intersections": intersections,
        "intersection_count": len(intersections)
    }