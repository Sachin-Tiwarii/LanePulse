
import express from "express";

import {
    startSimulation,
    getSimulationStatus,
    simulationSignalPlan,
    intersectionCleared
} from "../controllers/simulationController.js";

import {
    validateRoute,
    validateSimulationSignal,
    validateSessionId
} from "../validators/aiValidator.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Start Simulation
router.post("/start", authMiddleware, validateRoute, startSimulation);

// Get Simulation Status
router.get("/:sessionId", authMiddleware, validateSessionId, getSimulationStatus);

// Simulation Signal Plan
router.post(
    "/:sessionId/signal-plan",
    authMiddleware,
    validateSessionId,
    validateSimulationSignal,
    simulationSignalPlan
);

// Intersection Cleared
router.post(
    "/:sessionId/intersection-cleared",
    authMiddleware,
    validateSessionId,
    intersectionCleared
);

export default router;
