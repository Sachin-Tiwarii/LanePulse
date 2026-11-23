import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
GRAPH_PATH = DATA_DIR / "indore_drive.graphml"

APP_NAME = "Green Corridor AI Service"
APP_VERSION = "1.0.0"

# For local development, allow all origins.
# Later, set FRONTEND_URL to your deployed frontend URL.
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

# Maximum distance allowed between a requested coordinate
# and the nearest node in our prepared road graph.
MAX_SNAP_DISTANCE_METERS = 1500

# Estimated average road speed for demo duration calculation.
AVERAGE_SPEED_KMH = 30