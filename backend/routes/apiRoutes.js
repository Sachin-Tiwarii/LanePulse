import express from "express";

import authRoutes from "./authRoutes.js";
import aiRoutes from "./aiRoutes.js";
import simulationRoutes from "./simulationRoutes.js";

const router = express.Router();

// Authentication Routes
router.use("/auth", authRoutes);

// AI Routes
router.use("/ai", aiRoutes);

// Simulation Routes
router.use("/simulation", simulationRoutes);

export default router;