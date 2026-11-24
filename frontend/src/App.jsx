import { useState, useEffect, useRef, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Ambulance, Siren, Flame, Landmark, Shield, LayoutDashboard, Map as MapIcon,
  Activity, Settings as SettingsIcon, Sun, Moon, Maximize2, Minimize2, Plus, Minus,
  Locate, Mic, MicOff, LogOut, Search, X, Clock, Route as RouteIcon, MapPin, Flag,
  Play, RotateCcw, Gauge, Crosshair, PanelLeft, CheckCircle2,
} from 'lucide-react';

import 'leaflet/dist/leaflet.css';
import './App.css';
import { api } from './services/api';

const DEFAULT_CENTER = [22.7196, 75.8577];
// Indore search box: left, top, right, bottom
const INDORE_VIEWBOX = '75.70,22.88,76.05,22.50';

const VEHICLES = [
  { id: 'ambulance', label: 'Ambulance', Icon: Ambulance, color: '#ef4444' },
  { id: 'police', label: 'Police Van', Icon: Siren, color: '#3b82f6' },
  { id: 'fire', label: 'Fire Truck', Icon: Flame, color: '#f97316' },
  { id: 'bank', label: 'Bank Vehicle', Icon: Landmark, color: '#eab308' },
  { id: 'army', label: 'Army Truck', Icon: Shield, color: '#22c55e' },
];

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'live-map', label: 'Live Map', Icon: MapIcon },
  { id: 'simulation', label: 'Simulation', Icon: Play },
  { id: 'traffic', label: 'Traffic Analysis', Icon: Activity },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

// ---------- icons ----------
const svg = (el) => renderToStaticMarkup(el);

const vehicleIcon = (v) =>
  L.divIcon({
    html: `<div class="veh" style="--c:${v.color}">${svg(<v.Icon size={20} color="#fff" strokeWidth={2.2} />)}</div>`,
    className: 'veh-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const pinIcon = (Icon, color) =>
  L.divIcon({
    html: `<div class="pin" style="--c:${color}">${svg(<Icon size={16} color="#fff" />)}</div>`,
    className: 'pin-marker',
    iconSize: [32, 38],
    iconAnchor: [16, 36],
    popupAnchor: [0, -34],
  });

const signalIcon = (state) =>
  L.divIcon({
    html: `<div class="tl" data-state="${state}"><span class="lamp r"></span><span class="lamp g"></span></div>`,
    className: 'signal-marker',
    iconSize: [24, 42],
    iconAnchor: [12, 21],
  });

const toLampState = (s) => (s === 'GREEN' ? 'GREEN' : s === 'PREPARE' ? 'PREPARE' : 'RED');

// ---------- map helpers ----------
function SignalMarker({ signal }) {
  const ref = useRef(null);
  const state = toLampState(signal.signal_state);
  const [icon] = useState(() => signalIcon(state));

  // Update the existing DOM node so CSS transitions animate red -> green
  useEffect(() => {
    const el = ref.current?.getElement()?.querySelector('.tl');
    if (el) el.dataset.state = state;
  }, [state]);

  return (
    <Marker ref={ref} position={[signal.latitude, signal.longitude]} icon={icon}>
      <Popup>
        Priority {signal.priority_order}: {state === 'GREEN' ? 'GREEN' : state === 'PREPARE' ? 'SWITCHING' : 'RED'}
        <br />
        {Math.round(signal.distance_remaining_meters)} m remaining
      </Popup>
    </Marker>
  );
}

// Interpolates between polled positions for fluid movement
function SmoothMarker({ position, icon, children }) {
  const ref = useRef(null);
  const initial = useRef(position).current;
  const current = useRef(position);
  const raf = useRef(0);

  useEffect(() => {
    const marker = ref.current;
    if (!marker) return undefined;
    const from = current.current;
    const to = position;
    const start = performance.now();
    const duration = 1000;
    cancelAnimationFrame(raf.current);
    const step = (now) => {
      const k = Math.min(1, (now - start) / duration);
      const next = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
      current.current = next;
      marker.setLatLng(next);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [position]);

  return (
    <Marker ref={ref} position={initial} icon={icon} zIndexOffset={1000}>
      {children}
    </Marker>
  );
}

function MapController({ route, position, center, follow, fullscreen }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 1) map.fitBounds(route, { padding: [60, 60] });
  }, [route, map]);

  useEffect(() => {
    if (center && !(route && route.length > 1)) map.flyTo(center, 15);
  }, [center]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (route && route.length > 1) map.fitBounds(route, { padding: [60, 60] });
    }, 350);
    return () => clearTimeout(t);
  }, [fullscreen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (follow && position) map.panTo(position, { animate: true, duration: 1, easeLinearity: 1 });
  }, [position, follow, map]);

  return null;
}

function MapControls({ route, fullscreen, onFullscreen, follow, onFollow }) {
  const map = useMap();
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);

  const fit = () => {
    if (route && route.length > 1) map.fitBounds(route, { padding: [60, 60] });
    else map.flyTo(DEFAULT_CENTER, 13);
  };

  return (
    <div className="map-controls" ref={ref}>
      <button title="Zoom in" onClick={() => map.zoomIn(1)}><Plus size={18} /></button>
      <button title="Zoom out" onClick={() => map.zoomOut(1)}><Minus size={18} /></button>
      <button title="Fit route" onClick={fit}><Crosshair size={18} /></button>
      <button title="Follow vehicle" className={follow ? 'on' : ''} onClick={onFollow}><Locate size={18} /></button>
      <button title={fullscreen ? 'Exit full screen' : 'Full screen map'} onClick={onFullscreen}>
        {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
    </div>
  );
}

// ---------- small UI ----------
function AreaChart({ data }) {
  const w = 600, h = 140;
  if (data.length < 2) return <div className="chart-empty">Congestion trend appears once the simulation runs.</div>;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (Math.min(100, v) / 100) * (h - 10) - 5]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="area-chart">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#cg)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StatCard({ Icon, label, value, sub, badge, tone }) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span className="icon-chip"><Icon size={18} /></span>
        <span className="stat-label">{label}</span>
        {badge && <span className={`badge ${tone || ''}`}>{badge}</span>}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || localStorage.getItem('driver') || 'null');
  } catch {
    return null;
  }
}

// ======================================================
function App({ user: userProp, onLogout }) {
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

  // new UI state
  const [theme, setTheme] = useState(() => localStorage.getItem('lp-theme') || 'dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [vehicleId, setVehicleId] = useState('ambulance');
  const [mapFull, setMapFull] = useState(false);
  const [follow, setFollow] = useState(true);
  const [congestionHistory, setCongestionHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const vehicle = VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0];
  const vIcon = useMemo(() => vehicleIcon(vehicle), [vehicle]);
  const startPin = useMemo(() => pinIcon(MapPin, '#3b82f6'), []);
  const endPin = useMemo(() => pinIcon(Flag, '#ef4444'), []);

  const user = userProp || getStoredUser();
  const driverName = user?.name || user?.fullName || user?.username || 'Driver';
  const driverRole = user?.vehicleNumber || user?.role || (user?.isDemo ? 'Demo Account' : 'Emergency Driver');
  const initials = driverName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    if (onLogout) return onLogout();
    ['token', 'user', 'driver'].forEach((k) => localStorage.removeItem(k));
    window.location.reload();
    return undefined;
  };

  // ---------- theme ----------
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('lp-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMapFull(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mapFull ? 'hidden' : '';
  }, [mapFull]);

  // ---------- sidebar active section ----------
  useEffect(() => {
    const ids = NAV.map((n) => n.id);
    let ticking = false;

    const update = () => {
      ticking = false;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActiveSection(ids[ids.length - 1]);
        return;
      }
      let current = ids[0];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) current = id;
      });
      setActiveSection(current);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // ---------- health checks ----------
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const data = await api.aiHealth();
        if (active) setAiServiceStatus(data.aiService?.status === 'healthy' ? 'Connected' : 'Not Connected');
      } catch (error) {
        console.error('AI service health check failed:', error);
        if (active) setAiServiceStatus('Not Connected');
      }
    };
    check();
    const i = setInterval(check, 15000);
    return () => { active = false; clearInterval(i); };
  }, []);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        await api.backendHealth();
        if (active) setBackendStatus('Connected');
      } catch (error) {
        console.error('Backend health check failed:', error);
        if (active) setBackendStatus('Not Connected');
      }
    };
    check();
    const i = setInterval(check, 15000);
    return () => { active = false; clearInterval(i); };
  }, []);

  // ---------- helpers ----------
  const resetSimState = (status = 'Waiting to start') => {
    setAmbulanceProgress(0);
    setTrafficData(null);
    setPrioritySignals([]);
    setSimulationMetrics(null);
    setCongestionHistory([]);
    setAmbulancePosition(null);
    setSimulationSessionId(null);
    setIsSimulationRunning(false);
    setSimulationStatus(status);
  };

  // ---------- current location ----------
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    setMessage('Getting your current location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation([position.coords.latitude, position.coords.longitude]);
        setRouteCoordinates([]);
        setRouteInfo(null);
        setSearchedLocation(null);
        resetSimState();
        setLocationLoading(false);
        setMessage('Current location detected successfully.');
      },
      (error) => {
        setLocationLoading(false);
        setMessage(
          error.code === 1
            ? 'Location permission denied. Please allow location access.'
            : 'Unable to detect your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ---------- route ----------
  const getRoadRoute = async (start, end) => {
    const result = await api.getRoute({
      start_lat: start[0], start_lon: start[1], end_lat: end[0], end_lon: end[1],
    });
    if (!result?.success || !result.route?.route_coordinates?.length) {
      throw new Error(result?.message || 'No road route was returned by the routing service.');
    }
    const route = result.route;
    setRouteCoordinates(route.route_coordinates);
    setRouteInfo({
      distance: Number(route.distance_km).toFixed(2),
      time: Math.round(route.estimated_duration_minutes),
      intersections: route.intersections || [],
      intersectionCount: route.intersection_count || 0,
    });
    resetSimState('Route ready');
    setMessage('Road route calculated successfully using the LanePulse road network.');
  };

  // ---------- destination suggestions (Indore only) ----------
  const nominatim = (q, limit) =>
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=in&bounded=1&viewbox=${INDORE_VIEWBOX}&q=${encodeURIComponent(q)}`;

  const inIndore = (r) => {
    const s = r.address?.state;
    return !s || s === 'Madhya Pradesh';
  };

  useEffect(() => {
    const q = destination.trim();
    if (q.length < 3 || (selectedPlace && selectedPlace.label === destination)) {
      setSuggestions([]);
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(nominatim(`${q}, Indore`, 6), { signal: ctrl.signal });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(
          data.filter(inIndore).map((r) => ({
            id: r.place_id,
            title: r.name || r.display_name.split(',')[0],
            detail: r.display_name.split(',').slice(1, 4).join(',').trim(),
            label: r.display_name.split(',').slice(0, 2).join(',').trim(),
            lat: Number(r.lat),
            lon: Number(r.lon),
          }))
        );
        setShowSuggestions(true);
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Suggestion lookup failed:', e);
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [destination]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickSuggestion = (s) => {
    setSelectedPlace(s);
    setDestination(s.label);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // ---------- voice input ----------
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessage('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.onresult = (e) => {
      setSelectedPlace(null);
      setDestination(Array.from(e.results).map((r) => r[0].transcript).join(''));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setMessage('Voice input failed. Check microphone permission.');
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
    setMessage('Listening... say the destination in Indore.');
  };

  // ---------- search destination ----------
  const searchDestination = async () => {
    if (!currentLocation) return setMessage('Please detect your current location first.');
    if (!destination.trim()) return setMessage('Please enter a destination.');

    setLoading(true);
    setShowSuggestions(false);
    setMessage('Searching destination...');
    setRouteCoordinates([]);
    setRouteInfo(null);
    setSearchedLocation(null);
    resetSimState();

    try {
      let location;
      if (selectedPlace && selectedPlace.label === destination) {
        location = [selectedPlace.lat, selectedPlace.lon];
      } else {
        const response = await fetch(nominatim(`${destination}, Indore`, 5));
        if (!response.ok) throw new Error('Destination service unavailable.');
        const data = (await response.json()).filter(inIndore);
        if (!data.length) throw new Error('Destination not found in Indore, Madhya Pradesh.');
        location = [Number(data[0].lat), Number(data[0].lon)];
      }
      setSearchedLocation(location);
      await getRoadRoute(currentLocation, location);
    } catch (error) {
      setMessage(error.message || 'Destination search failed.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- start simulation ----------
  const startSimulation = async () => {
    if (routeCoordinates.length < 2) return setMessage('Please find a road route first.');
    if (!currentLocation || !searchedLocation) return setMessage('Starting location or destination is missing.');
    if (isSimulationRunning) return undefined;

    try {
      setLoading(true);
      setMessage(`Starting ${vehicle.label.toLowerCase()} simulation...`);
      const result = await api.startSimulation({
        start_lat: currentLocation[0], start_lon: currentLocation[1],
        end_lat: searchedLocation[0], end_lon: searchedLocation[1],
      });
      const sessionId =
        result.sessionId || result.simulation?.session_id || result.aiResponse?.simulation?.session_id;
      if (!sessionId) throw new Error('The backend did not return a simulation session ID.');

      setSimulationSessionId(sessionId);
      setAmbulanceProgress(0);
      setCongestionHistory([]);
      setAmbulancePosition(routeCoordinates[0]);
      setIsSimulationRunning(true);
      setSimulationStatus(`${vehicle.label} is moving`);
      setMessage('Emergency simulation started.');
    } catch (error) {
      console.error('Simulation start failed:', error);
      setMessage(error.message || 'Unable to start simulation.');
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  // ---------- poll simulation ----------
  useEffect(() => {
    if (!simulationSessionId || !isSimulationRunning) return undefined;
    let active = true;

    const poll = async () => {
      try {
        const result = await api.getSimulationStatus(simulationSessionId);
        const simulation = result.simulation;
        if (!active || !simulation) return;

        const progress = Math.min(100, Math.max(0, Number(simulation.progress ?? 0)));
        setAmbulanceProgress(progress);
        setTrafficData(simulation.traffic || null);
        if (simulation.traffic?.congestion_index != null) {
          setCongestionHistory((h) => [...h, Number(simulation.traffic.congestion_index)].slice(-40));
        }
        setPrioritySignals(simulation.priority_intersections || []);
        setSimulationMetrics({
          destinationEta: simulation.destination_eta_minutes,
          remainingDistance: simulation.distance_remaining_meters,
          nextIntersection: simulation.next_intersection,
        });

        if (Array.isArray(simulation.current_position) && simulation.current_position.length === 2) {
          setAmbulancePosition(simulation.current_position.map(Number));
        }

        if (simulation.status === 'completed' || simulation.destination_reached) {
          setAmbulanceProgress(100);
          if (routeCoordinates.length > 0) setAmbulancePosition(routeCoordinates[routeCoordinates.length - 1]);
          setIsSimulationRunning(false);
          setSimulationStatus('Simulation completed');
          setMessage('Emergency simulation completed.');
        } else {
          setSimulationStatus(`${vehicle.label} is moving`);
        }
      } catch (error) {
        console.error('Simulation polling failed:', error);
        if (active) {
          setIsSimulationRunning(false);
          setSimulationStatus('Simulation error');
          setMessage(error.message || 'Unable to retrieve simulation status.');
        }
      }
    };

    poll();
    const i = setInterval(poll, 1000);
    return () => { active = false; clearInterval(i); };
  }, [simulationSessionId, isSimulationRunning, routeCoordinates]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetSimulation = () => {
    resetSimState();
    setAmbulancePosition(routeCoordinates.length > 0 ? routeCoordinates[0] : null);
    setMessage('Simulation view reset. Start a new session to run again.');
  };

  const clearRoute = () => {
    setDestination('');
    setSelectedPlace(null);
    setSuggestions([]);
    setSearchedLocation(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
    resetSimState();
    setMessage('Route cleared.');
  };

  const nextSignal = simulationMetrics?.nextIntersection;
  const routeStatus = !routeInfo ? 'Waiting' : ambulanceProgress >= 100 ? 'Completed' : isSimulationRunning ? 'In Progress' : 'Route Ready';
  const etaText =
    isSimulationRunning && simulationMetrics?.destinationEta != null
      ? `${Number(simulationMetrics.destinationEta).toFixed(1)} min`
      : routeInfo ? `${routeInfo.time} min` : '--';
  const remainingText = simulationMetrics?.remainingDistance != null
    ? `${(simulationMetrics.remainingDistance / 1000).toFixed(2)} km`
    : routeInfo ? `${routeInfo.distance} km` : '--';
  const lampLabel = (s) => (s === 'GREEN' ? 'GREEN' : s === 'PREPARE' ? 'Switching' : 'RED');

  // ======================================================
  return (
    <div className={`app ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="LanePulse logo" />
          <div className="brand-text">
            <strong>LanePulse</strong>
            <span>Green Corridor AI</span>
          </div>
        </div>

        <nav>
          <span className="nav-group">Navigate</span>
          {NAV.map(({ id, label, Icon }) => (
            <a key={id} href={`#${id}`} title={label} className={activeSection === id ? 'active' : ''} onClick={() => setActiveSection(id)}>
              <Icon size={18} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className={`dot ${backendStatus === 'Connected' && aiServiceStatus === 'Connected' ? 'ok' : 'warn'}`} />
          <span className="foot-text">
            {backendStatus === 'Connected' && aiServiceStatus === 'Connected' ? 'All services online' : 'Service degraded'}
          </span>
        </div>
      </aside>

      <div className="workspace">
        {/* TOP BAR */}
        <header className="topbar">
          <button className="icon-btn" onClick={() => setSidebarCollapsed((c) => !c)} title="Toggle sidebar">
            <PanelLeft size={18} />
          </button>
          <div className="topbar-title">
            <h1>Emergency Dashboard</h1>
            <span>Indore, Madhya Pradesh · {vehicle.label}</span>
          </div>

          <div className="topbar-right">
            <label className="vehicle-select" style={{ '--c': vehicle.color }}>
              <vehicle.Icon size={16} />
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                disabled={isSimulationRunning}
                aria-label="Emergency vehicle type"
              >
                {VEHICLES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </label>

            <button
              className="icon-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Switch theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="profile">
              <span className="avatar">{initials || 'D'}</span>
              <div className="profile-text">
                <strong>{driverName}</strong>
                <span>{driverRole}</span>
              </div>
            </div>

            <button className="logout" onClick={handleLogout} title="Log out">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="main">
          {/* STATS */}
          <section className="stats" id="dashboard">
            <StatCard Icon={RouteIcon} label="Route Distance" value={routeInfo ? `${routeInfo.distance} km` : '--'} sub="Selected emergency route" />
            <StatCard Icon={Clock} label="Estimated Time" value={etaText} sub="Estimated travel duration" badge={isSimulationRunning ? 'Live' : null} tone="ok" />
            <StatCard Icon={Gauge} label="Vehicle Progress" value={`${Math.round(ambulanceProgress)}%`} sub="Simulation progress" />
            <StatCard Icon={CheckCircle2} label="Route Status" value={routeStatus} sub="Current route condition" badge={isSimulationRunning ? 'Active' : null} tone="ok" />
          </section>

          {/* MAP + PLANNER */}
          <section className="grid-main">
            <div className={`card map-card ${mapFull ? 'full' : ''}`} id="live-map">
              <div className="card-head">
                <div>
                  <h2>Emergency Route Map</h2>
                  <p>Route visualization and vehicle simulation</p>
                </div>
                <span className={`badge ${routeInfo ? 'ok' : ''}`}>{routeInfo ? 'Route available' : 'Waiting for route'}</span>
              </div>

              <div className="map-wrap">
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={13}
                  minZoom={10}
                  maxZoom={19}
                  zoomSnap={0.5}
                  zoomDelta={1}
                  zoomControl={false}
                  scrollWheelZoom
                  style={{ height: '100%', width: '100%' }}
                >
                  <MapController
                    route={routeCoordinates}
                    position={ambulancePosition}
                    center={currentLocation}
                    follow={follow && isSimulationRunning}
                    fullscreen={mapFull}
                  />
                  <MapControls
                    route={routeCoordinates}
                    fullscreen={mapFull}
                    onFullscreen={() => setMapFull((f) => !f)}
                    follow={follow}
                    onFollow={() => setFollow((f) => !f)}
                  />

                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {currentLocation && (
                    <Marker position={currentLocation} icon={startPin}><Popup>Starting Location</Popup></Marker>
                  )}
                  {searchedLocation && (
                    <Marker position={searchedLocation} icon={endPin}><Popup>Emergency Destination</Popup></Marker>
                  )}
                  {routeCoordinates.length > 0 && (
                    <Polyline positions={routeCoordinates} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.9 }} />
                  )}

                  {prioritySignals.map((signal) => (
                    <SignalMarker key={signal.intersection_id} signal={signal} />
                  ))}

                  {ambulancePosition && (
                    <SmoothMarker position={ambulancePosition} icon={vIcon}>
                      <Popup>{vehicle.label}: {Math.round(ambulanceProgress)}%</Popup>
                    </SmoothMarker>
                  )}
                </MapContainer>

                {/* Full-screen HUD */}
                {mapFull && (
                  <>
                    <div className="hud hud-top">
                      <span className="hud-icon" style={{ background: vehicle.color }}><vehicle.Icon size={18} color="#fff" /></span>
                      <div>
                        <strong>{vehicle.label}</strong>
                        <span>{simulationStatus}</span>
                      </div>
                      <div className="hud-bar"><i style={{ width: `${ambulanceProgress}%` }} /></div>
                      <b>{Math.round(ambulanceProgress)}%</b>
                    </div>
                    <div className="hud hud-bottom">
                      <div><span>ETA</span><strong>{etaText}</strong></div>
                      <div><span>Remaining</span><strong>{remainingText}</strong></div>
                      <div>
                        <span>Next signal</span>
                        <strong className={nextSignal?.signal_state === 'GREEN' ? 'green' : ''}>
                          {nextSignal ? lampLabel(nextSignal.signal_state) : '--'}
                          {nextSignal ? ` · ${Math.ceil(nextSignal.eta_seconds)}s` : ''}
                        </strong>
                      </div>
                      <div><span>Priority signals</span><strong>{prioritySignals.length || '--'}</strong></div>
                      <div><span>Traffic</span><strong className="cap">{trafficData?.density || '--'}</strong></div>
                      <div><span>Avg speed</span><strong>{trafficData ? `${trafficData.average_speed_kmh} km/h` : '--'}</strong></div>
                    </div>
                  </>
                )}
              </div>

              <div className="map-legend">
                <span><i style={{ background: '#3b82f6' }} />Start</span>
                <span><i style={{ background: '#ef4444' }} />Destination</span>
                <span><i style={{ background: vehicle.color }} />{vehicle.label}</span>
                <span><i className="sq" />Route</span>
              </div>
            </div>

            <div className="side-col">
              {/* ROUTE PLANNER */}
              <div className="card planner">
                <div className="card-head">
                  <div>
                    <h2>Route Selection</h2>
                    <p>Plan the emergency journey</p>
                  </div>
                  <span className="badge" style={{ color: vehicle.color }}><vehicle.Icon size={13} /> {vehicle.label}</span>
                </div>

                <label className="field-label">Starting location</label>
                <div className="location-display">
                  <MapPin size={15} />
                  {currentLocation ? `${currentLocation[0].toFixed(5)}, ${currentLocation[1].toFixed(5)}` : 'Current location not detected'}
                </div>
                <button className="btn secondary block" onClick={getCurrentLocation} disabled={locationLoading}>
                  <Locate size={16} /> {locationLoading ? 'Detecting location...' : 'Use my current location'}
                </button>

                <label className="field-label">Destination (Indore only)</label>
                <div className="search-box">
                  <Search size={16} className="lead" />
                  <input
                    value={destination}
                    onChange={(e) => { setDestination(e.target.value); setSelectedPlace(null); setShowSuggestions(true); }}
                    onFocus={() => suggestions.length && setShowSuggestions(true)}
                    onKeyDown={(e) => e.key === 'Enter' && searchDestination()}
                    placeholder="Hospital, station, area in Indore"
                    autoComplete="off"
                  />
                  {destination && (
                    <button className="mini" onClick={() => { setDestination(''); setSelectedPlace(null); setSuggestions([]); }} title="Clear text">
                      <X size={15} />
                    </button>
                  )}
                  <button className={`mini mic ${listening ? 'live' : ''}`} onClick={toggleMic} title="Speak destination">
                    {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>

                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="suggestions">
                      {suggestions.map((s) => (
                        <li key={s.id} onMouseDown={() => pickSuggestion(s)}>
                          <MapPin size={15} />
                          <div><strong>{s.title}</strong><span>{s.detail}</span></div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="row">
                  <button className="btn" onClick={searchDestination} disabled={loading}>
                    <RouteIcon size={16} /> {loading ? 'Searching...' : 'Find road route'}
                  </button>
                  <button className="btn secondary" onClick={clearRoute}>Clear</button>
                </div>
                {message && <p className="route-message">{message}</p>}
              </div>

              {/* SIGNAL STATUS */}
              <div className="card signals">
                <div className="card-head tight"><h2>Traffic Signal Status</h2></div>
                <div className="kv"><span>Priority signals selected</span><strong>{prioritySignals.length || '--'}</strong></div>
                <div className="kv">
                  <span>Next signal</span>
                  <strong className={nextSignal?.signal_state === 'GREEN' ? 'green' : nextSignal ? 'red' : ''}>
                    {nextSignal ? lampLabel(nextSignal.signal_state) : 'Waiting'}
                  </strong>
                </div>
                <div className="kv"><span>Next signal ETA</span><strong>{nextSignal ? `${Math.ceil(nextSignal.eta_seconds)} sec` : '--'}</strong></div>
                <div className="kv"><span>Signal lifecycle</span><strong className="cap">{nextSignal?.lifecycle?.replaceAll('_', ' ') || 'Not active'}</strong></div>
                <p className="note">Signal states are simulated for this prototype, not connected to physical traffic lights.</p>
              </div>
            </div>
          </section>

          {/* SIMULATION + INTERSECTIONS */}
          <section className="grid-two">
            <div className="card" id="simulation">
              <div className="card-head">
                <div><h2>Vehicle Tracking &amp; Simulation</h2><p>Backend-driven, not live GPS tracking</p></div>
                <span className={`badge ${isSimulationRunning ? 'ok' : ''}`}>{simulationStatus}</span>
              </div>
              <div className="kv"><span>Simulation progress</span><strong>{Math.round(ambulanceProgress)}%</strong></div>
              <div className="progress"><i style={{ width: `${ambulanceProgress}%` }} /></div>
              <div className="row">
                <button className="btn" onClick={startSimulation} disabled={!routeInfo || isSimulationRunning || loading}>
                  <Play size={16} />
                  {ambulanceProgress >= 100 ? 'Start new simulation' : isSimulationRunning ? 'Simulation running...' : 'Start simulation'}
                </button>
                <button className="btn secondary" onClick={resetSimulation} disabled={!routeInfo || loading}>
                  <RotateCcw size={16} /> Reset
                </button>
              </div>
              {simulationSessionId && <p className="note">Session: <strong>{simulationSessionId}</strong></p>}
            </div>

            <div className="card intersection-panel">
              <div className="card-head">
                <div>
                  <h2>Adaptive Priority Intersections</h2>
                  <p>
                    {prioritySignals.length
                      ? `${prioritySignals.length} selected from ${routeInfo?.intersectionCount || 0} route intersections`
                      : 'Appear when the simulation starts'}
                  </p>
                </div>
              </div>
              <div className="intersection-list">
                {prioritySignals.length ? prioritySignals.map((signal) => {
                  const st = toLampState(signal.signal_state);
                  return (
                    <div className="intersection-item" key={signal.intersection_id}>
                      <div className="tl-static" data-state={st}><span className="lamp r" /><span className="lamp g" /></div>
                      <div className="grow">
                        <h3>Priority {signal.priority_order} · Intersection {signal.route_order}</h3>
                        <p>{Math.round(signal.distance_remaining_meters)} m away · ETA {Math.ceil(signal.eta_seconds)} sec</p>
                        <p>{signal.traffic?.vehicle_count ?? '--'} vehicles · {signal.traffic?.density || 'Traffic pending'} density</p>
                      </div>
                      <span className={`pill ${st === 'GREEN' ? 'green-pill' : st === 'PREPARE' ? 'prep-pill' : 'red-pill'}`}>
                        {st === 'GREEN' ? 'Priority GREEN' : st === 'PREPARE' ? 'Switching' : 'Normal cycle'}
                      </span>
                    </div>
                  );
                }) : <p className="empty">No live simulation data yet.</p>}
              </div>
            </div>
          </section>

          {/* TRAFFIC */}
          <section className="card" id="traffic">
            <div className="card-head">
              <div><h2>Dynamic Traffic Simulation</h2><p>Algorithm-generated demo traffic, refreshed during simulation</p></div>
              <span className="badge">SIMULATED DATA</span>
            </div>
            <div className="traffic-summary">
              <div><span>Total vehicles</span><strong>{trafficData?.vehicle_count ?? '--'}</strong></div>
              <div><span>Traffic density</span><strong className="cap">{trafficData?.density || '--'}</strong></div>
              <div><span>Avg. road speed</span><strong>{trafficData ? `${trafficData.average_speed_kmh} km/h` : '--'}</strong></div>
              <div><span>Congestion index</span><strong>{trafficData ? `${trafficData.congestion_index}/100` : '--'}</strong></div>
            </div>
            <div className="chart-box">
              <span className="chart-title">Congestion trend</span>
              <AreaChart data={congestionHistory} />
            </div>
            <div className="traffic-segments">
              {trafficData?.segments?.map((segment) => (
                <div className="traffic-segment" key={segment.segment}>
                  <div className="seg-top">
                    <strong>Road segment {segment.segment}</strong>
                    <span className={`density-${segment.density}`}>{segment.density} traffic</span>
                  </div>
                  <div className="meter"><span style={{ width: `${segment.congestion_index}%` }} /></div>
                  <p>{segment.vehicle_count} vehicles · {segment.average_speed_kmh} km/h</p>
                </div>
              ))}
            </div>
            <p className="note">Traffic values are generated by a deterministic time-varying algorithm. They are not CCTV detections or live traffic measurements.</p>
          </section>

          {/* SETTINGS */}
          <section className="card" id="settings">
            <div className="card-head"><div><h2>System Connection Status</h2><p>Services and appearance</p></div></div>
            <div className="kv"><span>Node.js Backend</span><strong className={backendStatus === 'Connected' ? 'green' : 'amber'}>{backendStatus}</strong></div>
            <div className="kv"><span>Python AI Service</span><strong className={aiServiceStatus === 'Connected' ? 'green' : 'amber'}>{aiServiceStatus}</strong></div>
            <div className="kv"><span>Map Routing</span><strong className={routeInfo ? 'green' : 'amber'}>{routeInfo ? 'LanePulse Python Road Graph' : 'Waiting for route'}</strong></div>
            <div className="kv">
              <span>Theme</span>
              <button className="btn secondary sm" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;