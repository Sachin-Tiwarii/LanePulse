import express from "express";

import {
  startSimulation,
  getSimulationStatus,
  simulationSignalPlan,
  intersectionCleared,
} from "../controllers/simulationController.js";

import {
  validateRoute,
  validateSimulationSignal,
  validateSessionId,
} from "../validators/aiValidator.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All simulation endpoints require login
router.use(authMiddleware);

router.post(
  "/start",
  validateRoute,
  startSimulation
);

router.get(
  "/:sessionId",
  validateSessionId,
  getSimulationStatus
);

router.post(
  "/:sessionId/signal-plan",
  validateSessionId,
  validateSimulationSignal,
  simulationSignalPlan
);

router.post(
  "/:sessionId/intersection-cleared",
  validateSessionId,
  intersectionCleared
);

export default router;