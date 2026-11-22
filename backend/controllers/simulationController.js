
import {
    startSimulation as startAI,
    getSimulationStatus as getAIStatus,
    generateSignalPlan as getAISignalPlan,
    clearIntersection as clearAIIntersection,
} from "../services/aiService.js";

import Simulation from "../models/Simulation.js";

// Start Simulation
export const startSimulation = async (req, res) => {
    try {
        // Start simulation through AI service
        const result = await startAI(req.body);

        // Get session ID from AI response
        const sessionId = result.sessionId || result.session_id;

        if (!sessionId) {
            return res.status(502).json({
                success: false,
                message: "AI service did not return a session ID",
                data: result
            });
        }

        // Save simulation in MongoDB
        const simulation = await Simulation.create({
            userId: req.user._id,
            sessionId,
            startLocation: {
                lat: req.body.start_lat,
                lon: req.body.start_lon
            },
            destination: {
                lat: req.body.end_lat,
                lon: req.body.end_lon
            },
            route: result.route || {},
            status: "running"
        });

        res.status(201).json({
            success: true,
            message: "Simulation started and saved successfully",
            simulation,
            aiResponse: result
        });

    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.detail || error.message
        });
    }
};

// Get Simulation Status
export const getSimulationStatus = async (req, res) => {
    try {
        const simulation = await Simulation.findOne({
            sessionId: req.params.sessionId,
            userId: req.user._id
        });

        if (!simulation) {
            return res.status(404).json({
                success: false,
                message: "Simulation not found"
            });
        }

        const result = await getAIStatus(req.params.sessionId);

        // Update status when AI reports completion or failure
        if (result.status === "completed" || result.status === "failed") {
            simulation.status = result.status;
            await simulation.save();
        }

        res.json({
            success: true,
            simulation,
            aiResponse: result
        });

    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.detail || error.message
        });
    }
};

// Signal Plan for Simulation
export const simulationSignalPlan = async (req, res) => {
    try {
        const simulation = await Simulation.findOne({
            sessionId: req.params.sessionId,
            userId: req.user._id
        });

        if (!simulation) {
            return res.status(404).json({
                success: false,
                message: "Simulation not found"
            });
        }

        const result = await getAISignalPlan(
            req.params.sessionId,
            req.body
        );

        res.json({
            success: true,
            message: "Signal plan generated successfully",
            data: result
        });

    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.detail || error.message
        });
    }
};

// Intersection Cleared
export const intersectionCleared = async (req, res) => {
    try {
        const simulation = await Simulation.findOne({
            sessionId: req.params.sessionId,
            userId: req.user._id
        });

        if (!simulation) {
            return res.status(404).json({
                success: false,
                message: "Simulation not found"
            });
        }

        const result = await clearAIIntersection(
            req.params.sessionId,
            req.body
        );

        res.json({
            success: true,
            message: "Intersection cleared successfully",
            data: result
        });

    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.detail || error.message
        });
    }
};
