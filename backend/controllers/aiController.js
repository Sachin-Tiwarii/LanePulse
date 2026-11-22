import {
    getRoute as fetchRoute,
    analyzeTraffic as fetchTraffic,
    planSignal as fetchSignal,
    checkAIHealth,
} from "../services/aiService.js";

// Route Controller
export const getRoute = async (req, res) => {
    try {
        const result = await fetchRoute(req.body);
        res.json(result);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.detail || error.message,
        });
    }
};

// Traffic Analysis Controller
export const analyzeTraffic = async (req, res) => {
    try {
        const result = await fetchTraffic(req.body);
        res.json(result);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.detail || error.message,
        });
    }
};

// Signal Planning Controller
export const planSignal = async (req, res) => {
    try {
        const result = await fetchSignal(req.body);
        res.json(result);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.detail || error.message,
        });
    }
};

// AI Service Health Controller
export const aiHealthCheck = async (req, res) => {
    try {
        const result = await checkAIHealth();

        res.json({
            success: true,
            backend: "running",
            aiService: result,
        });

    } catch (error) {
        res.status(error.response?.status || 503).json({
            success: false,
            backend: "running",
            aiService: "unavailable",
            message: error.response?.data?.detail || error.message,
        });
    }
};
