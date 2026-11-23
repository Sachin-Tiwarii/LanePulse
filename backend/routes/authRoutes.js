import express from "express";

import {
  loginUser,
  demoLogin,
  getCurrentUser,
  logoutUser,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", loginUser);

router.post("/demo", demoLogin);

router.get("/me", authMiddleware, getCurrentUser);

router.post("/logout", authMiddleware, logoutUser);

export default router;