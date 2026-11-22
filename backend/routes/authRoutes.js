import express from "express";

import {
    registerUser,
    loginUser
} from "../controllers/authController.js";

import {
    validateRegister,
    validateLogin
} from "../validators/authValidator.js";

const router = express.Router();

// Signup API
router.post("/register", validateRegister, registerUser);

// Login API
router.post("/login", validateLogin, loginUser);

export default router;