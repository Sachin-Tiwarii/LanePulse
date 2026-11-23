const API_BASE_URL = "/api";

async function request(endpoint, options = {}) {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      `Request failed with status ${response.status}`
    );
  }

  return data;
}

export const api = {
  // Authentication
  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  demoLogin: () =>
    request("/auth/demo", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  getCurrentUser: () =>
    request("/auth/me"),

  logout: () =>
    request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  // Health checks
  backendHealth: () =>
    request("/health"),

  aiHealth: () =>
    request("/ai/health"),

  // Route
  getRoute: (payload) =>
    request("/ai/route", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Traffic
  analyzeTraffic: (payload) =>
    request("/ai/traffic/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Signal
  planSignal: (payload) =>
    request("/ai/signal/plan", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Simulation
  startSimulation: (payload) =>
    request("/simulation/start", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getSimulationStatus: (sessionId) =>
    request(
      `/simulation/${encodeURIComponent(sessionId)}`
    ),

  getSimulationSignalPlan: (sessionId, payload = {}) =>
    request(
      `/simulation/${encodeURIComponent(sessionId)}/signal-plan`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  clearIntersection: (sessionId) =>
    request(
      `/simulation/${encodeURIComponent(sessionId)}/intersection-cleared`,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    ),
};