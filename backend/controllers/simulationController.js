
import {
    startSimulation as startAI,
    getSimulationStatus as getAIStatus,
    generateSignalPlan as getAISignalPlan,
    clearIntersection as clearAIIntersection,
} from "../services/aiService.js";

// Start a simulation through the Python service.
export const startSimulation = async (req, res) => {
    try {
        const result = await startAI(req.body);

        const simulation = result.simulation;
        const sessionId = simulation?.session_id;

        if (!sessionId) {
            return res.status(502).json({
                success: false,
                message: "Python service did not return a simulation session ID.",
                data: result,
            });
        }

        return res.status(201).json({
            success: true,
            message: "Emergency simulation started successfully.",
            sessionId,
            simulation,
            route: result.route,
        });
    } catch (error) {
        console.error("Start simulation error:", error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message:
                error.response?.data?.detail ||
                error.message ||
                "Unable to start simulation.",
        });
    }
};

// Get simulation status from Python.
export const getSimulationStatus = async (req, res) => {
    try {
        const result = await getAIStatus(req.params.sessionId);

        return res.json({
            success: true,
            simulation: result.simulation,
        });
    } catch (error) {
        console.error("Simulation status error:", error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message:
                error.response?.data?.detail ||
                error.message ||
                "Unable to fetch simulation status.",
        });
    }
};

// Generate a signal plan for the current intersection.
export const simulationSignalPlan = async (req, res) => {
    try {
        const result = await getAISignalPlan(
            req.params.sessionId,
            req.body
        );

        return res.json({
            success: true,
            message: "Signal plan generated successfully.",
            data: result.signal_plan,
        });
    } catch (error) {
        console.error("Signal plan error:", error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message:
                error.response?.data?.detail ||
                error.message ||
                "Unable to generate signal plan.",
        });
    }
};

// Mark the current intersection as cleared.
export const intersectionCleared = async (req, res) => {
    try {
        const result = await clearAIIntersection(
            req.params.sessionId
        );

        return res.json({
            success: true,
            message: result.message || "Intersection cleared successfully.",
            data: result,
        });
    } catch (error) {
        console.error("Intersection clearance error:", error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message:
                error.response?.data?.detail ||
                error.message ||
                "Unable to clear intersection.",
        });
    }
};