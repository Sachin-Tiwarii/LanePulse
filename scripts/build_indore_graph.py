import osmnx as ox

from app.config import DATA_DIR, GRAPH_PATH


def build_graph():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("Downloading Indore road network...")

    # Central Indore coordinates
    center_point = (22.7196, 75.8577)

    # A 6 km radius keeps the initial demo graph manageable.
    graph = ox.graph_from_point(
        center_point=center_point,
        dist=6000,
        network_type="drive",
        simplify=True,
        retain_all=False
    )

    print("Preparing road network...")

    graph = ox.project_graph(graph)

    ox.save_graphml(graph, filepath=GRAPH_PATH)

    print("\nRoad network created successfully!")
    print(f"Saved at: {GRAPH_PATH}")
    print(f"Nodes: {len(graph.nodes)}")
    print(f"Edges: {len(graph.edges)}")


if __name__ == "__main__":
    build_graph()