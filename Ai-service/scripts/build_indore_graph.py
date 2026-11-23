
import osmnx as ox

from app.config import DATA_DIR, GRAPH_PATH


def build_graph():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("Downloading Indore road network...")

    # Central Indore
    center_point = (22.7196, 75.8577)

    # Expand coverage to a 12 km radius.
    graph = ox.graph_from_point(
        center_point=center_point,
        dist=12000,
        network_type="drive",
        simplify=True,
        retain_all=False
    )

    # IMPORTANT:
    # Keep the graph in EPSG:4326 (latitude/longitude).
    # graph_service.py uses longitude and latitude directly
    # with ox.distance.nearest_nodes().
    print("Keeping road graph in geographic coordinates...")

    ox.save_graphml(graph, filepath=GRAPH_PATH)

    print("\nIndore road network created successfully!")
    print(f"Saved at: {GRAPH_PATH}")
    print(f"Nodes: {len(graph.nodes)}")
    print(f"Edges: {len(graph.edges)}")
    print(f"CRS: {graph.graph.get('crs')}")


if __name__ == "__main__":
    build_graph()
