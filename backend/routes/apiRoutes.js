import express from "express";

import authRoutes from "./authRoutes.js";
import aiRoutes from "./aiRoutes.js";
import simulationRoutes from "./simulationRoutes.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "LanePulse API",
    status: "healthy",
  });
});

router.use("/auth", authRoutes);

router.use("/ai", aiRoutes);

router.use("/simulation", simulationRoutes);

export default router;