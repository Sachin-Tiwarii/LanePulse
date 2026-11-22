
import axios from "axios";

const AI_BASE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const aiClient = axios.create({
    baseURL: AI_BASE_URL,
    timeout: 30000,
});

// Route
export const getRoute = async (data) => {
    const response = await aiClient.post("/route", data);
    return response.data;
};

// Traffic Analysis
export const analyzeTraffic = async (data) => {
    const response = await aiClient.post("/traffic/analyze", data);
    return response.data;
};

// Signal Planning
export const planSignal = async (data) => {
    const response = await aiClient.post("/signal/plan", data);
    return response.data;
};

// Start Simulation
export const startSimulation = async (data) => {
    const response = await aiClient.post("/simulation/start", data);
    return response.data;
};

// Simulation Status
export const getSimulationStatus = async (sessionId) => {
    const response = await aiClient.get(`/simulation/${sessionId}`);
    return response.data;
};

// Simulation Signal Plan
export const generateSignalPlan = async (sessionId, data = {}) => {
    const response = await aiClient.post(
        `/simulation/${sessionId}/signal-plan`,
        data
    );
    return response.data;
};

// Intersection Cleared
export const clearIntersection = async (sessionId, data = {}) => {
    const response = await aiClient.post(
        `/simulation/${sessionId}/intersection-cleared`,
        data
    );
    return response.data;
};

// AI Service Health Check
export const checkAIHealth = async () => {
    const response = await aiClient.get("/health");
    return response.data;
};