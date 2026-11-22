import express from "express";

import {
    getRoute,
    analyzeTraffic,
    planSignal,
    aiHealthCheck
} from "../controllers/aiController.js";

import {
    validateRoute,
    validateTraffic,
    validateSignalPlan
} from "../validators/aiValidator.js";

const router = express.Router();

// AI Health Check
router.get("/health", aiHealthCheck);

// Route API
router.post("/route", validateRoute, getRoute);

// Traffic Analysis API
router.post("/traffic/analyze", validateTraffic, analyzeTraffic);

// Signal Planning API
router.post("/signal/plan", validateSignalPlan, planSignal);

export default router;