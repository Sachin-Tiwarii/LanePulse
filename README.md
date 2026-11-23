# Green Corridor AI Service

**AI-Assisted Emergency Vehicle Routing and Traffic Signal Coordination System**

An AI-assisted emergency vehicle routing and traffic signal simulation service designed for Indore, Madhya Pradesh, India.

The Green Corridor AI Service generates optimized emergency routes, identifies intersections along the journey, estimates traffic conditions, and recommends signal timing adjustments to help emergency vehicles move through urban road networks with minimal delay.

The service uses OpenStreetMap road network data, graph-based routing algorithms, and traffic analysis to simulate the creation and management of a green corridor for emergency vehicles.

---

## 1. Overview

In urban areas, emergency vehicles such as ambulances and fire trucks can experience significant delays due to traffic congestion and traffic signal interruptions.

The Green Corridor system aims to address this challenge by coordinating route planning and simulated traffic signal management.

The AI service acts as the intelligence layer of the system. It receives emergency journey information, calculates suitable routes, identifies important intersections, analyzes traffic conditions, and generates signal timing recommendations.

The service is developed primarily for the Indore road network and can be extended to support other cities with the appropriate road network data.

## 2. Key Features

### 2.1 Optimized Emergency Route Calculation
- Calculates shortest road routes using NetworkX graph algorithms.
- Uses OpenStreetMap road network data to represent the city's transportation infrastructure.
- Considers road connectivity and network structure when calculating routes.
- Returns route information for visualization and further processing.

### 2.2 Automatic Intersection Detection
- Identifies intersections located along the calculated emergency route.
- Extracts relevant road network nodes for intersection identification.
- Determines the sequence of intersections that an emergency vehicle must pass through.
- Supports coordinated management of multiple intersections during a journey.

### 2.3 Traffic Density Analysis
- Processes detected vehicle counts to estimate traffic density.
- Analyzes vehicle distribution to understand traffic conditions.
- Categorizes traffic conditions for further signal planning.
- Provides traffic analysis results to the signal recommendation system.

### 2.4 Emergency Signal Timing Recommendations
- Generates signal timing recommendations for intersections along an emergency route.
- Determines suitable signal priority and timing adjustments for emergency movement.
- Supports sequential intersection-level signal planning.
- Helps coordinate the simulated green corridor activation process.

### 2.5 Green Corridor Simulation
- Simulates emergency corridor activation.
- Coordinates signal priority across multiple intersections.
- Manages the progression of an emergency vehicle through the selected route.
- Simulates signal restoration after an intersection has been cleared.

### 2.6 Multi-Intersection Journey Management
- Creates and manages emergency journey sessions.
- Tracks the progress of an emergency vehicle through its route.
- Provides journey status information using session identifiers.
- Supports planning the next intersection and advancing the journey after an intersection is cleared.

---

## 3. System Architecture

The AI service is built using a modular architecture in which routing, traffic analysis, signal planning, and simulation are handled as separate responsibilities.

### Core Processing Workflow

1. **Emergency Request:** Receives the starting and destination coordinates of an emergency vehicle.
2. **Route Calculation:** Calculates an optimized road route using the OpenStreetMap road network and NetworkX.
3. **Intersection Identification:** Identifies the intersections along the generated route.
4. **Traffic Analysis:** Processes available vehicle counts to estimate traffic density.
5. **Signal Planning:** Generates emergency signal timing recommendations.
6. **Corridor Activation:** Simulates coordinated signal priority along the emergency route.
7. **Journey Monitoring:** Tracks emergency vehicle movement and intersection clearance.
8. **Signal Restoration:** Simulates the restoration of normal signal operation after the emergency vehicle passes.

### High-Level Architecture

```text
              Emergency Request
                      |
                      v
              FastAPI Application
                      |
                      v
               Route Calculation
               (NetworkX + OSM)
                      |
                      v
             Intersection Detection
                      |
                      v
                Traffic Analysis
                      |
                      v
                Signal Planning
                      |
                      v
             Green Corridor Simulation
                      |
                      v
              Journey Management
                      |
                      v
              Signal Restoration
```

---

## 4. Technology Stack

| Technology | Purpose |
|---|---|
| Python 3.11 | Core programming language |
| FastAPI | REST API development |
| NetworkX | Road network graph processing and route calculation |
| OSMnx | OpenStreetMap road network acquisition and processing |
| SciPy | Scientific and numerical computation |
| OpenStreetMap | Geographic and road network data |

### Supporting Technologies
- Uvicorn – ASGI server for running the FastAPI application.
- Pydantic – Request validation and data modeling through FastAPI.
- Graph-based algorithms – Road network traversal and route optimization.

---

## 5. Project Structure

The AI service follows a modular Python application structure.

```text
Ai-service/
│
├── app/
│   ├── main.py
│   │
│   ├── routes/
│   │   ├── route_routes.py
│   │   ├── traffic_routes.py
│   │   ├── signal_routes.py
│   │   └── simulation_routes.py
│   │
│   ├── services/
│   │   ├── routing_service.py
│   │   ├── traffic_service.py
│   │   ├── signal_service.py
│   │   └── simulation_service.py
│   │
│   └── models/
│
├── data/
│   └── indore_drive.graphml
│
├── scripts/
│   └── build_indore_graph.py
│
├── requirements.txt
└── README.md
```

*Note: The structure above represents the logical organization of the service. Adjust individual filenames to match the actual repository structure.*

---

## 6. Installation and Setup

### Prerequisites

Ensure the following software is installed:

- Python 3.11
- pip
- Git
- Internet connectivity for downloading OpenStreetMap data when building the road network graph.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd green-corridor-ai/Ai-service
```

### Step 2: Create a Virtual Environment

```bash
python -m venv .venv
```

Activate the environment.

**Windows PowerShell:**

```powershell
.venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**

```cmd
.venv\Scripts\activate.bat
```

**Linux / macOS:**

```bash
source .venv/bin/activate
```

### Step 3: Install Dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Build the Indore Road Network

```bash
python -m scripts.build_indore_graph
```

This script prepares the road network graph used by the routing service.

The generated graph is stored in the project's data directory and is used for subsequent route calculations.

*The graph generally needs to be generated once and can be reused unless the road network data or graph-building configuration changes.*

---

## 7. Running the AI Service

Start the FastAPI application from the `Ai-service` directory:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once the service starts successfully, it will be accessible at:

| Resource | URL |
|---|---|
| Base URL | http://127.0.0.1:8000 |
| Interactive API Documentation | http://127.0.0.1:8000/docs |
| Alternative API Documentation | http://127.0.0.1:8000/redoc |
| Health Check | http://127.0.0.1:8000/health |

The interactive Swagger documentation allows developers to inspect available endpoints, review request and response schemas, and execute API requests.

---

## 8. API Documentation

The AI service exposes REST API endpoints for route generation, traffic analysis, signal planning, and emergency journey simulation.

### 8.1 Health Check

**GET** `/health`

Checks whether the AI service is running and responding to requests.

### 8.2 Route Calculation

**POST** `/route`

Calculates a road route between the specified starting and destination locations.

**Purpose:**
- Process geographic coordinates.
- Retrieve or access the road network graph.
- Calculate a suitable route using graph-based routing.
- Return route information for further processing and visualization.

### 8.3 Emergency Route Generation

**POST** `/kickoff`

Initiates the emergency route generation workflow.

**Purpose:**
- Accept emergency vehicle journey details.
- Generate an optimized emergency route.
- Identify intersections along the route.
- Prepare the information required for subsequent corridor coordination.

### 8.4 Traffic Analysis

**POST** `/traffic/analyze`

Analyzes vehicle count information to estimate traffic density.

**Purpose:**
- Process detected vehicle counts.
- Estimate traffic conditions.
- Generate traffic analysis results.
- Provide traffic information for signal planning.

### 8.5 Signal Timing Plan

**POST** `/signal/plan`

Generates a signal timing recommendation for an intersection.

**Purpose:**
- Evaluate the available traffic information.
- Generate emergency signal priority recommendations.
- Provide suggested signal timing adjustments.

### 8.6 Signal Release

**POST** `/signal/release`

Simulates the release of emergency signal priority and restoration of normal signal operation.

**Purpose:**
- End the simulated emergency signal priority.
- Restore the normal signal state.
- Support the transition back to regular traffic operation.

### 8.7 Start Emergency Simulation

**POST** `/simulation/start`

Starts an emergency vehicle journey simulation.

**Purpose:**
- Initialize an emergency journey.
- Create a simulation session.
- Manage the emergency vehicle's progress through the route.
- Coordinate intersection-level signal planning.

### 8.8 Get Simulation Status

**GET** `/simulation/{session_id}`

Retrieves the current status of an emergency journey using its session identifier.

**Purpose:**
- Retrieve journey information.
- Track simulation progress.
- Obtain the current journey state.

### 8.9 Plan the Next Intersection

**POST** `/simulation/{session_id}/signal-plan`

Generates a signal plan for the next intersection in an active emergency journey.

**Purpose:**
- Identify the next intersection.
- Generate the corresponding signal timing recommendation.
- Support sequential green corridor management.

### 8.10 Clear an Intersection

**POST** `/simulation/{session_id}/intersection-cleared`

Marks an intersection as cleared and advances the emergency journey simulation.

**Purpose:**
- Update the journey progress.
- Record the completed intersection.
- Advance to the next intersection.
- Support subsequent signal planning and corridor coordination.

### Endpoint Summary

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check service availability |
| POST | `/route` | Calculate a road route |
| POST | `/kickoff` | Generate an emergency route |
| POST | `/traffic/analyze` | Analyze vehicle counts |
| POST | `/signal/plan` | Generate signal timing recommendations |
| POST | `/signal/release` | Restore simulated signals |
| POST | `/simulation/start` | Start an emergency journey |
| GET | `/simulation/{session_id}` | Retrieve journey status |
| POST | `/simulation/{session_id}/signal-plan` | Plan the next intersection |
| POST | `/simulation/{session_id}/intersection-cleared` | Clear an intersection and advance the journey |

*For exact request parameters, required fields, response structures, and validation rules, refer to the live Swagger documentation at `/docs`.*

---

## 9. Integration with the Backend

The AI service operates as a separate processing service and can be integrated with the Node.js/Express backend.

The backend acts as the application gateway between the frontend and the AI service.

### Integration Flow

```text
React Frontend
      |
      | HTTP Request
      v
Node.js / Express Backend
      |
      | Internal API Request
      v
FastAPI AI Service
      |
      v
Routing / Traffic / Signal / Simulation
      |
      v
AI Service Response
      |
      v
Express Backend
      |
      v
React Frontend
```

The backend is responsible for handling frontend requests and communicating with the AI service. The AI service focuses on route processing, traffic analysis, signal recommendations, and simulation logic.

This separation makes the system modular and allows the AI service to be developed and maintained independently.

---

## 10. Project Scope and Limitations

The Green Corridor AI Service is an academic and demonstration-oriented project designed to demonstrate emergency vehicle routing and coordinated traffic signal simulation.

The following limitations are important:

- Traffic density estimations depend on the vehicle count information provided to the service.
- Traffic conditions and signal timing recommendations are generated for simulation purposes.
- The system does not currently establish direct connections with real-world traffic signal controllers.
- Signal activation and restoration are simulated rather than physically executed.
- Route quality depends on the availability, accuracy, and completeness of OpenStreetMap road network data.
- The service does not guarantee real-world emergency response times.
- Actual deployment would require integration with authorized traffic management infrastructure, validated live traffic data, safety mechanisms, and approval from relevant authorities.

**This system is a prototype for emergency route optimization and traffic signal coordination. It does not control real-world traffic infrastructure.**

---

## 11. Future Enhancements

Potential future improvements include:

- Integration with live traffic data sources.
- Real-time vehicle detection using computer vision.
- Dynamic route recalculation based on changing traffic conditions.
- Machine learning-based traffic density prediction.
- More advanced emergency signal scheduling and coordination.
- Support for additional emergency vehicle categories.
- Expansion of road network coverage to additional cities.
- Integration with authorized intelligent transportation systems.
- Real-time vehicle tracking and journey monitoring.

---

## 12. Development and Contribution

Developers working on the AI service should:

1. Create and activate a Python virtual environment.
2. Install dependencies from `requirements.txt`.
3. Ensure the Indore road network graph is available.
4. Run the FastAPI application locally.
5. Use `/docs` to inspect and test API endpoints.
6. Verify route, traffic, signal, and simulation functionality before integrating changes.

When adding new functionality, keep routing, traffic analysis, signal planning, and simulation logic modular.

---

## 13. License and Usage

This project is developed for educational, research, and demonstration purposes.

OpenStreetMap data is provided under the Open Database License (ODbL). Refer to the [OpenStreetMap Copyright and License](https://www.openstreetmap.org/copyright) page for attribution and licensing requirements.

---

**Green Corridor AI Service**  
*Intelligent Emergency Routing. Coordinated Signal Simulation. Smarter Urban Mobility.*

Developed as part of the Green Corridor AI project for Indore, Madhya Pradesh, India.