
import { useState, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from 'react-leaflet'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

const DEFAULT_CENTER = [22.7196, 75.8577]

const ambulanceIcon = L.divIcon({
  html: '<div style="font-size:30px">🚑</div>',
  className: 'ambulance-marker',
  iconSize: [35, 35],
  iconAnchor: [17, 17]
})

function MapUpdater({ position, route }) {
  const map = useMap()

  useEffect(() => {
    if (route && route.length > 1) {
      map.fitBounds(route, { padding: [40, 40] })
    } else if (position) {
      map.flyTo(position, 15)
    }
  }, [position, route, map])

  return null
}
function App() {
  const [destination, setDestination] = useState('')
  const [currentLocation, setCurrentLocation] = useState(null)
  const [searchedLocation, setSearchedLocation] = useState(null)

  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [routeInfo, setRouteInfo] = useState(null)

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)

  const [backendStatus, setBackendStatus] = useState('Not Connected')
  const [aiServiceStatus, setAiServiceStatus] = useState('Checking...')
  const [activeSection, setActiveSection] = useState('dashboard')

  const [ambulanceProgress, setAmbulanceProgress] = useState(0)
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)

  // Sidebar active section
  useEffect(() => {

    const sections = document.querySelectorAll(
      '#dashboard, #live-map, #simulation, #traffic, #settings'
    )

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          )

        if (visibleSections.length > 0) {
          setActiveSection(visibleSections[0].target.id)
        }
      },
      {
        threshold: [0.2, 0.5, 0.8],
        rootMargin: '-10% 0px -50% 0px'
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

    // Python AI Service connection check
  useEffect(() => {
    const checkAIService = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/health')

        if (!response.ok) {
          throw new Error('AI service unavailable')
        }

        const data = await response.json()

        setAiServiceStatus(
          data.status === 'healthy' ? 'Connected' : 'Not Connected'
        )
      } catch {
        setAiServiceStatus('Not Connected')
      }
    }

    checkAIService()
  }, [])

  // Detect current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser.')
      return
    }

    setLocationLoading(true)
    setMessage('Getting your current location...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = [
          position.coords.latitude,
          position.coords.longitude
        ]

        setCurrentLocation(location)
        setRouteCoordinates([])
        setRouteInfo(null)
        setSearchedLocation(null)
        setAmbulanceProgress(0)
        setIsSimulationRunning(false)

        setLocationLoading(false)
        setMessage('Current location detected successfully.')
      },
      (error) => {
        setLocationLoading(false)

        if (error.code === 1) {
          setMessage('Location permission denied. Please allow location access.')
        } else {
          setMessage('Unable to detect your location. Please try again.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    )
  }

  // Search destination
  const searchDestination = async () => {
    if (!currentLocation) {
      setMessage('Please detect your current location first.')
      return
    }

    if (!destination.trim()) {
      setMessage('Please enter a destination.')
      return
    }

    setLoading(true)
    setMessage('Searching destination...')

    setRouteCoordinates([])
    setRouteInfo(null)
    setSearchedLocation(null)
    setAmbulanceProgress(0)
    setIsSimulationRunning(false)

    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(destination + ', Indore, India')}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Destination service unavailable.')
      }

      const data = await response.json()

      if (!data.length) {
        throw new Error('Destination not found.')
      }

      const location = [
        Number(data[0].lat),
        Number(data[0].lon)
      ]

      setSearchedLocation(location)

      await getRoadRoute(currentLocation, location)

    } catch (error) {
      setMessage(error.message || 'Destination search failed.')
    } finally {
      setLoading(false)
    }
  }

  // Get road route
  const getRoadRoute = async (start, end) => {
    const startPoint = `${start[1]},${start[0]}`
    const endPoint = `${end[1]},${end[0]}`

    const url =
      `https://router.project-osrm.org/route/v1/driving/${startPoint};${endPoint}?overview=full&geometries=geojson`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Road route service is unavailable.')
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes?.length) {
      throw new Error('No road route found.')
    }

    const route = data.routes[0]

    const coordinates = route.geometry.coordinates.map(
      ([longitude, latitude]) => [latitude, longitude]
    )

    setRouteCoordinates(coordinates)

    setRouteInfo({
      distance: (route.distance / 1000).toFixed(2),
      time: Math.round(route.duration / 60)
    })

    setMessage('Road route calculated successfully.')
  }

  // Backend connection check
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5000/health')

        if (!response.ok) {
          throw new Error('Backend unavailable')
        }

        setBackendStatus('Connected')
      } catch {
        setBackendStatus('Not Connected')
      }
    }

    checkBackend()
  }, [])

  // Ambulance movement simulation
  useEffect(() => {
    if (!isSimulationRunning || routeCoordinates.length < 2) {
      return
    }

    const interval = setInterval(() => {
      setAmbulanceProgress((previous) => {
        const next = Math.min(previous + 1, 100)

        if (next >= 100) {
          setIsSimulationRunning(false)
          setMessage('Ambulance simulation completed.')
        }

        return next
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isSimulationRunning, routeCoordinates.length])

  // Ambulance position on route
  const ambulanceIndex = routeCoordinates.length > 0
    ? Math.min(
        Math.floor((ambulanceProgress / 100) * (routeCoordinates.length - 1)),
        routeCoordinates.length - 1
      )
    : 0

  const ambulancePosition = routeCoordinates.length > 0
    ? routeCoordinates[ambulanceIndex]
    : null

  // Start simulation
  const startSimulation = () => {
    if (routeCoordinates.length < 2) {
      setMessage('Please find a road route first.')
      return
    }

    if (ambulanceProgress >= 100) {
      setAmbulanceProgress(0)
    }

    setIsSimulationRunning(true)
    setMessage('Ambulance simulation started.')
  }

  // Reset simulation
  const resetSimulation = () => {
    setIsSimulationRunning(false)
    setAmbulanceProgress(0)
    setMessage('Ambulance simulation reset.')
  }

  // Clear route
  const clearRoute = () => {
    setDestination('')
    setSearchedLocation(null)
    setRouteCoordinates([])
    setRouteInfo(null)
    setAmbulanceProgress(0)
    setIsSimulationRunning(false)
    setMessage('Route cleared.')
  }

  return (
    <div className="app">

      {/* Sidebar */}
      <aside className="sidebar">
        <h2>🚑 LanePulse</h2>
        <p>AI Emergency System</p>

        <nav>
          <a href="#dashboard" className={activeSection === 'dashboard' ? 'active' : ''}>
            Dashboard
          </a>

          <a href="#live-map" className={activeSection === 'live-map' ? 'active' : ''}>
            Live Map
          </a>

          <a href="#simulation" className={activeSection === 'simulation' ? 'active' : ''}>
            Simulation
          </a>

          <a href="#traffic" className={activeSection === 'traffic' ? 'active' : ''}>
            Traffic Analysis
          </a>

          <a href="#settings" className={activeSection === 'settings' ? 'active' : ''}>
            Settings
          </a>
        </nav>
      </aside>

      <main className="main">

        {/* Dashboard Header */}
        <header className="dashboard-header">
          <div>
            <h1>Emergency Dashboard</h1>
            <p>AI-Powered Green Corridor Management System</p>
            <span className="header-subtitle">
              Smart Emergency Route Monitoring
            </span>
          </div>

          <div className="header-status">
            <span className="status-dot"></span>
            <span>Map Services Active</span>
          </div>
        </header>

        {/* Dashboard Statistics */}
        <section className="stats" id="dashboard">

          <div className="card">
            <h3>📍 Route Distance</h3>
            <h1>{routeInfo ? `${routeInfo.distance} km` : '--'}</h1>
            <p>Selected emergency route</p>
          </div>

          <div className="card">
            <h3>⏱️ Estimated Time</h3>
            <h1>{routeInfo ? `${routeInfo.time} min` : '--'}</h1>
            <p>Estimated travel duration</p>
          </div>

          <div className="card">
            <h3>🚑 Ambulance Progress</h3>
            <h1>{ambulanceProgress}%</h1>
            <p>Simulation progress</p>
          </div>

          <div className="card">
            <h3>🟢 Route Status</h3>
            <h1>
              {!routeInfo
                ? 'Waiting'
                : ambulanceProgress === 100
                  ? 'Completed'
                  : isSimulationRunning
                    ? 'In Progress'
                    : 'Route Ready'}
            </h1>
            <p>Current route condition</p>
          </div>

        </section>

        {/* Emergency Route Selection */}
        <section className="card location-box">

          <div className="route-heading">
            <div>
              <h2>Emergency Route Selection</h2>
              <p>Plan and monitor your emergency journey</p>
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
              📍 {locationLoading
                ? 'Detecting Location...'
                : 'Use My Current Location'}
            </button>
          </div>

          <div className="route-field">
            <label>🎯 Emergency Destination</label>

            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination in Indore"
            />

            <div className="route-actions">
              <button
                onClick={searchDestination}
                disabled={loading}
              >
                🔍 {loading ? 'Searching...' : 'Find Road Route'}
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

        {/* Map and Signal Information */}
        <section className="content">

          <div className="card map" id="live-map">

            <div className="map-heading">
              <div>
                <h2>Emergency Route Map</h2>
                <p>Route visualization and ambulance simulation</p>
              </div>

              <span className="map-badge">
                {routeInfo ? 'Route Available' : 'Waiting for Route'}
              </span>
            </div>

            <div className="map-container">

              <MapContainer
                center={DEFAULT_CENTER}
                zoom={13}
                style={{
                  height: '100%',
                  width: '100%',
                  borderRadius: '12px'
                }}
              >

                <MapUpdater
                  position={currentLocation}
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
                      weight: 6
                    }}
                  />
                )}

                {ambulancePosition && (
                  <Marker
                    position={ambulancePosition}
                    icon={ambulanceIcon}
                  >
                    <Popup>
                      Ambulance Simulation: {ambulanceProgress}%
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

            <p>
              <span>AI Signal Control</span>
              <strong className="yellow">Awaiting Backend</strong>
            </p>

            <p>
              <span>Emergency Priority</span>
              <strong className="yellow">Not Available</strong>
            </p>

            <p>
              Signal information will appear after backend integration.
            </p>
          </div>

        </section>

        {/* Ambulance Simulation */}
        <section
          className="card simulation"
          id="simulation"
          style={{ marginBottom: '25px' }}
        >

          <h2>Ambulance Tracking & Simulation</h2>

          <p>
            Simulation Progress:
            <strong> {ambulanceProgress}%</strong>
          </p>

          <div style={{
            width: '100%',
            height: '14px',
            background: '#26344b',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            <div style={{
              width: `${ambulanceProgress}%`,
              height: '100%',
              background: '#22c55e',
              transition: 'width 0.4s'
            }} />
          </div>

          <button
            onClick={startSimulation}
            disabled={!routeInfo || isSimulationRunning}
          >
            {ambulanceProgress > 0 && ambulanceProgress < 100
              ? 'Continue Simulation'
              : 'Start Simulation'}
          </button>

          <button
            onClick={() => setIsSimulationRunning(false)}
            disabled={!isSimulationRunning}
            style={{ marginLeft: '10px' }}
          >
            Pause
          </button>

          <button
            onClick={resetSimulation}
            disabled={!routeInfo}
            style={{ marginLeft: '10px' }}
          >
            Reset
          </button>

          <p>
            Status: {isSimulationRunning
              ? 'Ambulance is moving'
              : ambulanceProgress === 100
                ? 'Simulation completed'
                : ambulanceProgress > 0
                  ? 'Simulation paused'
                  : 'Waiting to start'}
          </p>

          <p>
            Note: This is a frontend simulation, not real ambulance tracking.
          </p>

        </section>

        {/* Intersection Information */}
        <section className="card intersection-panel">

          <h2>Intersection Information</h2>

          <p>
            Total Intersections on Route:
            <strong className="yellow"> Awaiting AI Data</strong>
          </p>

          <div className="intersection-list">

            <div className="intersection-item">
              <div>
                <h3>Route Intersections</h3>
                <p>Intersections detected along the selected route</p>
              </div>
              <span className="pending-status">Awaiting Data</span>
            </div>

            <div className="intersection-item">
              <div>
                <h3>Ambulance Approach</h3>
                <p>Upcoming intersection information</p>
              </div>
              <span className="pending-status">Awaiting Data</span>
            </div>

            <div className="intersection-item">
              <div>
                <h3>Intersection Clearance</h3>
                <p>Clearance status for emergency route</p>
              </div>
              <span className="pending-status">Awaiting Data</span>
            </div>

          </div>

          <p className="yellow">
            Intersection details will be provided by the backend and AI service.
          </p>

        </section>

        {/* Traffic Density Analysis */}
        <section
          className="card"
          id="traffic"
          style={{ marginBottom: '25px' }}
        >

          <h2>Traffic Density Analysis</h2>

          <p className="yellow">
            AI Analysis Status: Waiting for Python AI Service
          </p>

          <div className="intersection-list">

            <div className="intersection-item">
              <div>
                <h3>Traffic Level</h3>
                <p>Current road traffic condition</p>
              </div>
              <span className="pending-status">Awaiting Data</span>
            </div>

            <div className="intersection-item">
              <div>
                <h3>Vehicle Count</h3>
                <p>Total vehicles detected on route</p>
              </div>
              <span className="pending-status">Awaiting Data</span>
            </div>

            <div className="intersection-item">
              <div>
                <h3>Traffic Analysis</h3>
                <p>AI-based traffic prediction</p>
              </div>
              <span className="pending-status">Awaiting Data</span>
            </div>

          </div>

          <p className="yellow">
            Actual traffic information will appear after AI backend integration.
          </p>

        </section>

        {/* System Connection Status */}
        <section
          className="card simulation"
          id="settings"
        >

          <h2>System Connection Status</h2>

          <p>
            Node.js Backend:
            <strong className={backendStatus === 'Connected' ? 'green' : 'yellow'}>
              {' '}{backendStatus}
            </strong>
          </p>

          <p>
            Python AI Service:
            <strong className={aiServiceStatus === 'Connected' ? 'green' : 'yellow'}>
  {aiServiceStatus}
</strong>
          </p>

          <p>
            Map Routing:
            <strong className="green"> OpenStreetMap / OSRM</strong>
          </p>

        </section>

      </main>
    </div>
  )
}

export default App
