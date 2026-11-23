# LanePulse Database

**Database:** MongoDB Atlas | **Database name:** `lanepulse`

## Collections

### 1. users
| Field | Type | Required | Notes |
|---|---|---|---|
| name | String | Yes | |
| email | String | Yes | Unique index |
| password_hash | String | Yes | Hashed password, never plain text |
| role | String | No | `admin` or `operator` |
| created_at | Date | No | |

### 2. simulations
| Field | Type | Required | Notes |
|---|---|---|---|
| session_id | String | Yes | From AI service, unique index |
| user_id | ObjectId | Yes | Reference to users._id |
| start | Object {lat, lon} | Yes | lat/lon are doubles |
| end | Object {lat, lon} | Yes | lat/lon are doubles |
| status | String | Yes | `running`, `completed` or `failed` |
| distance_km | Number | No | |
| duration_min | Number | No | |
| created_at | Date | No | |
| intersections | Array | No | Embedded, see below |

**Each intersection (embedded):**
`order`, `lat`, `lon`, `crossed` are required.
`name`, `vehicle_count`, `traffic_level` (`low`/`medium`/`high`), `signal` are optional.
`signal` holds `green_duration_sec`, `green_started_at`, `released_at`.

## Design decisions
- **Embedded intersections:** a route has few intersections (about 5) and they are always read together with their simulation.
- **user_id is a reference:** one user can have many simulations (one-to-many).
- **Live signal state is not stored.** Only a summary record per intersection is saved.
- **Validation:** JSON Schema validation is applied on both collections.

## Backend operations
- Start simulation: insert a new `simulations` document.
- Intersection cleared: set `intersections.$.crossed = true` and `intersections.$.signal.released_at`.
- Simulation finished: set `status = "completed"`.

## Security
Connection string and passwords are NOT in this repo. Keep `MONGODB_URI` in `.env` and add `.env` to `.gitignore`.
