
import { useState, useEffect } from 'react';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';

import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import './App.css';

import { api } from './services/api';

const DEFAULT_CENTER = [22.7196, 75.8577];

const ambulanceIcon = L.divIcon({
  html: '<div style="font-size:30px">🚑</div>',
  className: 'ambulance-marker',
  iconSize: [35, 35],
  iconAnchor: [17, 17],
});

function MapUpdater({ position, route }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 1) {
      map.fitBounds(route, { padding: [40, 40] });
    } else if (position) {
      map.flyTo(position, 15);
    }
  }, [position, route, map]);

  return null;
}

function App() {
  const [destination, setDestination] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);

  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [backendStatus, setBackendStatus] = useState('Not Connected');
  const [aiServiceStatus, setAiServiceStatus] = useState('Checking...');
  const [activeSection, setActiveSection] = useState('dashboard');

  const [ambulanceProgress, setAmbulanceProgress] = useState(0);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSessionId, setSimulationSessionId] = useState(null);
  const [ambulancePosition, setAmbulancePosition] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('Waiting to start');
  const [trafficData, setTrafficData] = useState(null);
  const [prioritySignals, setPrioritySignals] = useState([]);
  const [simulationMetrics, setSimulationMetrics] = useState(null);

  // --------------------------------------------------
  // SIDEBAR ACTIVE SECTION
  // --------------------------------------------------

  useEffect(() => {
    const sections = document.querySelectorAll(
      '#dashboard, #live-map, #simulation, #traffic, #settings'
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          );

        if (visibleSections.length > 0) {
          setActiveSection(visibleSections[0].target.id);
        }
      },
      {
        threshold: [0.2, 0.5, 0.8],
        rootMargin: '-10% 0px -50% 0px',
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  // --------------------------------------------------
  // CHECK PYTHON AI SERVICE
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    const checkAIService = async () => {
      try {
        const data = await api.aiHealth();

        if (active) {
          setAiServiceStatus(
            data.aiService?.status === 'healthy'
              ? 'Connected'
              : 'Not Connected'
          );
        }
      } catch (error) {
        console.error('AI service health check failed:', error);

        if (active) {
          setAiServiceStatus('Not Connected');
        }
      }
    };

    checkAIService();

    const interval = setInterval(checkAIService, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // --------------------------------------------------
  // CHECK EXPRESS BACKEND
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    const checkBackend = async () => {
      try {
        await api.backendHealth();

        if (active) {
          setBackendStatus('Connected');
        }
      } catch (error) {
        console.error('Backend health check failed:', error);

        if (active) {
          setBackendStatus('Not Connected');
        }
      }
    };

    checkBackend();

    const interval = setInterval(checkBackend, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // --------------------------------------------------
  // CURRENT LOCATION
  // --------------------------------------------------

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setMessage('Getting your current location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        setCurrentLocation(location);
        setRouteCoordinates([]);
        setRouteInfo(null);
        setSearchedLocation(null);
        setAmbulanceProgress(0);
        setTrafficData(null);
        setPrioritySignals([]);
        setSimulationMetrics(null);
        setAmbulancePosition(null);
        setSimulationSessionId(null);
        setIsSimulationRunning(false);
        setSimulationStatus('Waiting to start');

        setLocationLoading(false);
        setMessage('Current location detected successfully.');
      },
      (error) => {
        setLocationLoading(false);

        if (error.code === 1) {
          setMessage(
            'Location permission denied. Please allow location access.'
          );
        } else {
          setMessage(
            'Unable to detect your location. Please try again.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // --------------------------------------------------
  // GET ROAD ROUTE
  // --------------------------------------------------

  const getRoadRoute = async (start, end) => {
    const result = await api.getRoute({
      start_lat: start[0],
      start_lon: start[1],
      end_lat: end[0],
      end_lon: end[1],
    });

    if (
      !result?.success ||
      !result.route?.route_coordinates?.length
    ) {
      throw new Error(
        result?.message ||
        'No road route was returned by the routing service.'
      );
    }

    const route = result.route;

    setRouteCoordinates(route.route_coordinates);

    setRouteInfo({
      distance: Number(route.distance_km).toFixed(2),
      time: Math.round(route.estimated_duration_minutes),
      intersections: route.intersections || [],
      intersectionCount: route.intersection_count || 0,
    });

    setAmbulanceProgress(0);
    setTrafficData(null);
    setPrioritySignals([]);
    setSimulationMetrics(null);
    setAmbulancePosition(null);
    setSimulationSessionId(null);
    setIsSimulationRunning(false);
    setSimulationStatus('Route ready');

    setMessage(
      'Road route calculated successfully using the LanePulse road network.'
    );
  };

  // --------------------------------------------------
  // SEARCH DESTINATION
  // --------------------------------------------------

  const searchDestination = async () => {
    if (!currentLocation) {
      setMessage('Please detect your current location first.');
      return;
    }

    if (!destination.trim()) {
      setMessage('Please enter a destination.');
      return;
    }

    setLoading(true);
    setMessage('Searching destination...');

    setRouteCoordinates([]);
    setRouteInfo(null);
    setSearchedLocation(null);
    setAmbulanceProgress(0);
    setTrafficData(null);
    setPrioritySignals([]);
    setSimulationMetrics(null);
    setAmbulancePosition(null);
    setSimulationSessionId(null);
    setIsSimulationRunning(false);
    setSimulationStatus('Waiting to start');

    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(
          destination + ', Indore, India'
        )}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Destination service unavailable.');
      }

      const data = await response.json();

      if (!data.length) {
        throw new Error('Destination not found.');
      }

      const location = [
        Number(data[0].lat),
        Number(data[0].lon),
      ];

      setSearchedLocation(location);

      await getRoadRoute(currentLocation, location);
    } catch (error) {
      setMessage(
        error.message || 'Destination search failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // START SIMULATION
  // --------------------------------------------------

  const startSimulation = async () => {
    if (routeCoordinates.length < 2) {
      setMessage('Please find a road route first.');
      return;
    }

    if (!currentLocation || !searchedLocation) {
      setMessage('Starting location or destination is missing.');
      return;
    }

    if (isSimulationRunning) {
      return;
    }

    try {
      setLoading(true);
      setMessage('Starting emergency simulation...');

      const result = await api.startSimulation({
        start_lat: currentLocation[0],
        start_lon: currentLocation[1],
        end_lat: searchedLocation[0],
        end_lon: searchedLocation[1],
      });

      const sessionId =
        result.sessionId ||
        result.simulation?.session_id ||
        result.aiResponse?.simulation?.session_id;

      if (!sessionId) {
        throw new Error(
          'The backend did not return a simulation session ID.'
        );
      }

      setSimulationSessionId(sessionId);
      setAmbulanceProgress(0);
      setAmbulancePosition(routeCoordinates[0]);
      setIsSimulationRunning(true);
      setSimulationStatus('Ambulance is moving');
      setMessage('Emergency simulation started.');
    } catch (error) {
      console.error('Simulation start failed:', error);

      setMessage(
        error.message || 'Unable to start simulation.'
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // POLL PYTHON SIMULATION
  // --------------------------------------------------

  useEffect(() => {
    if (!simulationSessionId || !isSimulationRunning) {
      return;
    }

    let active = true;

    const pollSimulation = async () => {
      try {
        const result = await api.getSimulationStatus(
          simulationSessionId
        );

        const simulation = result.simulation;

        if (!active || !simulation) {
          return;
        }

        const progress = Math.min(
          100,
          Math.max(0, Number(simulation.progress ?? 0))
        );

        setAmbulanceProgress(progress);
        setTrafficData(simulation.traffic || null);
        setPrioritySignals(simulation.priority_intersections || []);
        setSimulationMetrics({
          destinationEta: simulation.destination_eta_minutes,
          remainingDistance: simulation.distance_remaining_meters,
          nextIntersection: simulation.next_intersection,
        });

        if (
          Array.isArray(simulation.current_position) &&
          simulation.current_position.length === 2
        ) {
          setAmbulancePosition(
            simulation.current_position.map(Number)
          );
        }

        if (
          simulation.status === 'completed' ||
          simulation.destination_reached
        ) {
          setAmbulanceProgress(100);

          if (routeCoordinates.length > 0) {
            setAmbulancePosition(
              routeCoordinates[routeCoordinates.length - 1]
            );
          }

          setIsSimulationRunning(false);
          setSimulationStatus('Simulation completed');
          setMessage('Emergency simulation completed.');
        } else {
          setSimulationStatus('Ambulance is moving');
        }
      } catch (error) {
        console.error('Simulation polling failed:', error);

        if (active) {
          setIsSimulationRunning(false);
          setSimulationStatus('Simulation error');
          setMessage(
            error.message ||
            'Unable to retrieve simulation status.'
          );
        }
      }
    };

    pollSimulation();

    const interval = setInterval(pollSimulation, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    simulationSessionId,
    isSimulationRunning,
    routeCoordinates,
  ]);

  // --------------------------------------------------
  // RESET SIMULATION
  // --------------------------------------------------

  const resetSimulation = () => {
    setIsSimulationRunning(false);
    setSimulationSessionId(null);
    setAmbulanceProgress(0);
    setTrafficData(null);
    setPrioritySignals([]);
    setSimulationMetrics(null);
    setAmbulancePosition(
      routeCoordinates.length > 0
        ? routeCoordinates[0]
        : null
    );
    setSimulationStatus('Waiting to start');

    setMessage(
      'Simulation view reset. Start a new session to run again.'
    );
  };

  // --------------------------------------------------
  // CLEAR ROUTE
  // --------------------------------------------------

  const clearRoute = () => {
    setDestination('');
    setSearchedLocation(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
    setAmbulanceProgress(0);
    setTrafficData(null);
    setPrioritySignals([]);
    setSimulationMetrics(null);
    setAmbulancePosition(null);
    setIsSimulationRunning(false);
    setSimulationSessionId(null);
    setSimulationStatus('Waiting to start');

    setMessage('Route cleared.');
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">
        <h2>🚑 LanePulse</h2>
        <p>AI Emergency System</p>

        <nav>
          <a
            href="#dashboard"
            className={
              activeSection === 'dashboard' ? 'active' : ''
            }
          >
            Dashboard
          </a>

          <a
            href="#live-map"
            className={
              activeSection === 'live-map' ? 'active' : ''
            }
          >
            Live Map
          </a>

          <a
            href="#simulation"
            className={
              activeSection === 'simulation' ? 'active' : ''
            }
          >
            Simulation
          </a>

          <a
            href="#traffic"
            className={
              activeSection === 'traffic' ? 'active' : ''
            }
          >
            Traffic Analysis
          </a>

          <a
            href="#settings"
            className={
              activeSection === 'settings' ? 'active' : ''
            }
          >
            Settings
          </a>
        </nav>
      </aside>

      <main className="main">

        {/* DASHBOARD HEADER */}

        <header className="dashboard-header">
          <div>
            <h1>Emergency Dashboard</h1>
            <p>
              AI-Powered Green Corridor Management System
            </p>

            <span className="header-subtitle">
              Smart Emergency Route Monitoring
            </span>
          </div>

          <div className="header-status">
            <span className="status-dot"></span>
            <span>Map Services Active</span>
          </div>
        </header>

        {/* DASHBOARD STATISTICS */}

        <section className="stats" id="dashboard">

          <div className="card">
            <h3>📍 Route Distance</h3>
            <h1>
              {routeInfo
                ? `${routeInfo.distance} km`
                : '--'}
            </h1>
            <p>Selected emergency route</p>
          </div>

          <div className="card">
            <h3>⏱️ Estimated Time</h3>
            <h1>
              {isSimulationRunning && simulationMetrics?.destinationEta != null
                ? `${Number(simulationMetrics.destinationEta).toFixed(1)} min`
                : routeInfo
                  ? `${routeInfo.time} min`
                  : '--'}
            </h1>
            <p>Estimated travel duration</p>
          </div>

          <div className="card">
            <h3>🚑 Ambulance Progress</h3>
            <h1>{Math.round(ambulanceProgress)}%</h1>
            <p>Simulation progress</p>
          </div>

          <div className="card">
            <h3>🟢 Route Status</h3>
            <h1>
              {!routeInfo
                ? 'Waiting'
                : ambulanceProgress >= 100
                  ? 'Completed'
                  : isSimulationRunning
                    ? 'In Progress'
                    : 'Route Ready'}
            </h1>
            <p>Current route condition</p>
          </div>

        </section>

        {/* EMERGENCY ROUTE SELECTION */}

        <section className="card location-box">

          <div className="route-heading">
            <div>
              <h2>Emergency Route Selection</h2>
              <p>
                Plan and monitor your emergency journey
              </p>
            </div>

            <span className="route-badge">
              🚑 Emergency Route
            </span>
          </div>

          <div className="route-field">
            <label>📍 Starting Location</label>

            <div className="location-display">
              {currentLocation
                ? `${currentLocation[0].toFixed(5)}, ${currentLocation[1].toFixed(5)}`
                : 'Current location not detected'}
            </div>

            <button
              onClick={getCurrentLocation}
              disabled={locationLoading}
            >
              📍{' '}
              {locationLoading
                ? 'Detecting Location...'
                : 'Use My Current Location'}
            </button>
          </div>

          <div className="route-field">
            <label>🎯 Emergency Destination</label>

            <input
              value={destination}
              onChange={(event) =>
                setDestination(event.target.value)
              }
              placeholder="Enter destination in Indore"
            />

            <div className="route-actions">
              <button
                onClick={searchDestination}
                disabled={loading}
              >
                🔍{' '}
                {loading
                  ? 'Searching...'
                  : 'Find Road Route'}
              </button>

              <button onClick={clearRoute}>
                Clear Route
              </button>
            </div>
          </div>

          {message && (
            <p className="route-message">{message}</p>
          )}

        </section>

        {/* MAP AND SIGNAL INFORMATION */}

        <section className="content">

          <div className="card map" id="live-map">

            <div className="map-heading">
              <div>
                <h2>Emergency Route Map</h2>
                <p>
                  Route visualization and ambulance simulation
                </p>
              </div>

              <span className="map-badge">
                {routeInfo
                  ? 'Route Available'
                  : 'Waiting for Route'}
              </span>
            </div>

            <div className="map-container">

              <MapContainer
                center={DEFAULT_CENTER}
                zoom={13}
                style={{
                  height: '100%',
                  width: '100%',
                  borderRadius: '12px',
                }}
              >

                <MapUpdater
                  position={ambulancePosition || currentLocation}
                  route={routeCoordinates}
                />

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {currentLocation && (
                  <Marker position={currentLocation}>
                    <Popup>Starting Location</Popup>
                  </Marker>
                )}

                {searchedLocation && (
                  <Marker position={searchedLocation}>
                    <Popup>Emergency Destination</Popup>
                  </Marker>
                )}

                {routeCoordinates.length > 0 && (
                  <Polyline
                    positions={routeCoordinates}
                    pathOptions={{
                      color: '#06b6d4',
                      weight: 6,
                    }}
                  />
                )}

                {prioritySignals.map((signal) => (
                  <Marker
                    key={signal.intersection_id}
                    position={[signal.latitude, signal.longitude]}
                    icon={L.divIcon({
                      html: `<div style="font-size:23px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))">${signal.signal_state === 'GREEN' ? '🟢' : signal.signal_state === 'PREPARE' ? '🟡' : '🚦'}</div>`,
                      className: 'signal-map-marker',
                      iconSize: [28, 28],
                      iconAnchor: [14, 14],
                    })}
                  >
                    <Popup>
                      Priority {signal.priority_order}: {signal.signal_state}
                      <br />
                      {Math.round(signal.distance_remaining_meters)} m remaining
                    </Popup>
                  </Marker>
                ))}

                {ambulancePosition && (
                  <Marker
                    position={ambulancePosition}
                    icon={ambulanceIcon}
                  >
                    <Popup>
                      Ambulance Simulation:{' '}
                      {Math.round(ambulanceProgress)}%
                    </Popup>
                  </Marker>
                )}

              </MapContainer>

            </div>

            <div className="map-legend">
              <span>📍 Starting Location</span>
              <span>🎯 Destination</span>
              <span>🚑 Ambulance</span>
              <span>🟦 Route</span>
            </div>

          </div>

          <div className="card signals">
            <h2>Traffic Signal Status</h2>
            <p><span>Priority signals selected</span><strong>{prioritySignals.length || '--'}</strong></p>
            <p><span>Next signal</span><strong className={simulationMetrics?.nextIntersection?.signal_state === 'GREEN' ? 'green' : 'yellow'}>{simulationMetrics?.nextIntersection?.signal_state || 'Waiting'}</strong></p>
            <p><span>Next signal ETA</span><strong>{simulationMetrics?.nextIntersection ? `${Math.ceil(simulationMetrics.nextIntersection.eta_seconds)} sec` : '--'}</strong></p>
            <p><span>Signal lifecycle</span><strong>{simulationMetrics?.nextIntersection?.lifecycle?.replaceAll('_', ' ') || 'Not active'}</strong></p>
            <p className="simulation-note">Signal states are simulated for this prototype, not connected to physical traffic lights.</p>
          </div>

        </section>

        {/* AMBULANCE SIMULATION */}

        <section
          className="card simulation"
          id="simulation"
          style={{ marginBottom: '25px' }}
        >

          <h2>Ambulance Tracking & Simulation</h2>

          <p>
            Simulation Progress:
            <strong>
              {' '}{Math.round(ambulanceProgress)}%
            </strong>
          </p>

          <div
            style={{
              width: '100%',
              height: '14px',
              background: '#26344b',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: `${ambulanceProgress}%`,
                height: '100%',
                background: '#22c55e',
                transition: 'width 0.8s linear',
              }}
            />
          </div>

          <button
            onClick={startSimulation}
            disabled={
              !routeInfo ||
              isSimulationRunning ||
              loading
            }
          >
            {ambulanceProgress >= 100
              ? 'Start New Simulation'
              : isSimulationRunning
                ? 'Simulation Running...'
                : 'Start Simulation'}
          </button>

          <button
            onClick={resetSimulation}
            disabled={!routeInfo || loading}
            style={{ marginLeft: '10px' }}
          >
            Reset
          </button>

          <p>
            Status: {simulationStatus}
          </p>

          {simulationSessionId && (
            <p className="simulation-session">
              Session:{' '}
              <strong>{simulationSessionId}</strong>
            </p>
          )}

          <p>
            Note: This is a backend-driven simulation,
            not live ambulance GPS tracking.
          </p>

        </section>

        {/* ADAPTIVE PRIORITY INTERSECTIONS */}
        <section className="card intersection-panel">
          <h2>Adaptive Priority Intersections</h2>
          <p className="yellow">
            {prioritySignals.length
              ? `${prioritySignals.length} priority intersections selected from ${routeInfo?.intersectionCount || 0} route intersections.`
              : 'Priority intersections will appear when the simulation starts.'}
          </p>
          <div className="intersection-list">
            {prioritySignals.length ? prioritySignals.map((signal) => (
              <div className="intersection-item" key={signal.intersection_id}>
                <div>
                  <h3>Priority {signal.priority_order} · Intersection {signal.route_order}</h3>
                  <p>{Math.round(signal.distance_remaining_meters)} m away · ETA {Math.ceil(signal.eta_seconds)} sec</p>
                  <p>{signal.traffic?.vehicle_count ?? '--'} vehicles · {signal.traffic?.density || 'Traffic pending'} density</p>
                </div>
                <span className={`signal-pill ${signal.signal_state === 'GREEN' ? 'signal-green' : signal.signal_state === 'PREPARE' ? 'signal-prepare' : 'signal-normal'}`}>
                  {signal.signal_state === 'GREEN' ? 'Priority GREEN' : signal.signal_state === 'PREPARE' ? 'Preparing' : 'Normal cycle'}
                </span>
              </div>
            )) : <p className="empty-state">No live simulation data yet.</p>}
          </div>
        </section>

        {/* GENERATED TRAFFIC ANALYSIS */}
        <section className="card traffic-panel" id="traffic">
          <div className="traffic-heading">
            <div>
              <h2>Dynamic Traffic Simulation</h2>
              <p>Algorithm-generated demo traffic · refreshed during simulation</p>
            </div>
            <span className="simulation-tag">SIMULATED DATA</span>
          </div>
          <div className="traffic-summary">
            <div><span>Total vehicles</span><strong>{trafficData?.vehicle_count ?? '--'}</strong></div>
            <div><span>Traffic density</span><strong>{trafficData?.density || '--'}</strong></div>
            <div><span>Avg. road speed</span><strong>{trafficData ? `${trafficData.average_speed_kmh} km/h` : '--'}</strong></div>
            <div><span>Congestion index</span><strong>{trafficData ? `${trafficData.congestion_index}/100` : '--'}</strong></div>
          </div>
          <div className="traffic-segments">
            {trafficData?.segments?.map((segment) => (
              <div className="traffic-segment" key={segment.segment}>
                <div className="traffic-segment-top">
                  <strong>Road segment {segment.segment}</strong>
                  <span className={`density-${segment.density}`}>{segment.density} traffic</span>
                </div>
                <div className="traffic-meter"><span style={{ width: `${segment.congestion_index}%` }} /></div>
                <p>{segment.vehicle_count} vehicles · {segment.average_speed_kmh} km/h</p>
              </div>
            ))}
          </div>
          <p className="simulation-note">Traffic values are generated by a deterministic time-varying algorithm. They are not CCTV detections or live traffic measurements.</p>
        </section>

        {/* SYSTEM CONNECTION STATUS */}

        <section
          className="card simulation"
          id="settings"
        >

          <h2>System Connection Status</h2>

          <p>
            Node.js Backend:
            <strong
              className={
                backendStatus === 'Connected'
                  ? 'green'
                  : 'yellow'
              }
            >
              {' '}{backendStatus}
            </strong>
          </p>

          <p>
            Python AI Service:
            <strong
              className={
                aiServiceStatus === 'Connected'
                  ? 'green'
                  : 'yellow'
              }
            >
              {' '}{aiServiceStatus}
            </strong>
          </p>

          <p>
            Map Routing:
            <strong
              className={routeInfo ? 'green' : 'yellow'}
            >
              {' '}
              {routeInfo
                ? 'LanePulse Python Road Graph'
                : 'Waiting for route'}
            </strong>
          </p>

        </section>

      </main>
    </div>
  );
}

export default App;
