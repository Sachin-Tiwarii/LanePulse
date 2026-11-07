# Green Corridor AI Service

An AI-assisted emergency vehicle routing and traffic signal simulation service for Indore, Madhya Pradesh.

## Features

- Shortest road route calculation using NetworkX and OpenStreetMap.
- Automatic identification of intersections along the route.
- Traffic density estimation from detected vehicle counts.
- Emergency signal timing recommendations.
- Simulated green corridor activation and signal restoration.
- Multi-intersection emergency journey management.

## Technology Stack

- Python 3.11
- FastAPI
- NetworkX
- OSMnx
- SciPy
- OpenStreetMap

## Setup

```bash
python -m venv .venv
pip install -r requirements.txt
python -m scripts.build_indore_graph
```

## Run locally

```bash
uvicorn app.main:app --reload
```

API documentation: `http://localhost:8000/docs`

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/route` | Calculate shortest route |
| POST | `/kickoff` | Generate emergency route |
| POST | `/traffic/analyze` | Analyse vehicle counts |
| POST | `/signal/plan` | Generate signal timing plan |
| POST | `/signal/release` | Restore simulated signals |
| POST | `/simulation/start` | Start emergency journey |
| GET | `/simulation/{session_id}` | Get journey status |
| POST | `/simulation/{session_id}/signal-plan` | Plan next intersection |
| POST | `/simulation/{session_id}/intersection-cleared` | Clear intersection and advance |

## Project Scope

This project demonstrates emergency vehicle routing and coordinated traffic signal simulation. Traffic density and signal timings are estimated for demonstration purposes. It does not control real-world traffic infrastructure.