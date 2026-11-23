import express from "express";

import {
  getRoute,
  analyzeTraffic,
  planSignal,
  aiHealthCheck,
} from "../controllers/aiController.js";

import {
  validateRoute,
  validateTraffic,
  validateSignalPlan,
} from "../validators/aiValidator.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public health check
router.get("/health", aiHealthCheck);

// Protect all remaining AI endpoints
router.use(authMiddleware);

router.post("/route", validateRoute, getRoute);

router.post(
  "/traffic/analyze",
  validateTraffic,
  analyzeTraffic
);

router.post(
  "/signal/plan",
  validateSignalPlan,
  planSignal
);

export default router;