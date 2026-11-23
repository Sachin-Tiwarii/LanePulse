
import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";

import connectDB from "./config/db.js";
import User from "./models/User.js";

import errorMiddleware from "./middleware/errorMiddleware.js";
import notFoundMiddleware from "./middleware/notFoundMiddleware.js";

import apiRoutes from "./routes/apiRoutes.js";

// ========================================
// EXPRESS APP
// ========================================

const app = express();

// ========================================
// CORS CONFIGURATION
// ========================================

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

// ========================================
// GLOBAL MIDDLEWARE
// ========================================

app.use(express.json({ limit: "2mb" }));

app.use(cookieParser());

// ========================================
// BASIC ROUTES
// ========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to LanePulse Backend",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "LanePulse Backend",
    status: "healthy",
  });
});

// ========================================
// API ROUTES
// ========================================

app.use("/api", apiRoutes);

// ========================================
// ERROR HANDLING
// ========================================

app.use(notFoundMiddleware);

app.use(errorMiddleware);

// ========================================
// CREATE DEMO USER
// ========================================

const ensureDemoUser = async () => {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  if (!email || !password) {
    console.warn(
      "Demo account not created. Set DEMO_EMAIL and DEMO_PASSWORD."
    );

    return;
  }

  if (password.length < 12) {
    throw new Error(
      "DEMO_PASSWORD must contain at least 12 characters."
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check whether the demo account already exists
  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    if (existingUser.role !== "operator") {
      throw new Error(
        "Demo account email already exists with a non-operator role."
      );
    }

    console.log(
      "LanePulse demo account already exists."
    );

    return;
  }

  // Hash demo password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create demo user matching MongoDB schema
  await User.create({
    name: "LanePulse Demo",
    email: normalizedEmail,
    password_hash: hashedPassword,
    role: "operator",
  });

  console.log(
    "LanePulse demo account created successfully."
  );
};

// ========================================
// SERVER CONFIGURATION
// ========================================

const PORT = process.env.PORT || 5000;

// ========================================
// START SERVER
// ========================================

const startServer = async () => {
  try {
    // Check environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is required."
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is required."
      );
    }

    // Connect MongoDB
    await connectDB();

    console.log(
      "Checking LanePulse demo account..."
    );

    // Create demo account if it doesn't exist
    await ensureDemoUser();

    // Start Express server
    app.listen(PORT, () => {
      console.log("");
      console.log("====================================");
      console.log("       LANEPULSE BACKEND STARTED");
      console.log("====================================");

      console.log(
        `Backend:  http://localhost:${PORT}`
      );

      console.log(
        `Health:   http://localhost:${PORT}/health`
      );

      console.log(
        `AI Health: http://localhost:${PORT}/api/ai/health`
      );

      console.log("====================================");
      console.log("");
    });

  } catch (error) {
    console.error("");
    console.error("====================================");
    console.error("  LANEPULSE SERVER STARTUP FAILED");
    console.error("====================================");

    console.error("Error:", error.message);

    // Mongoose validation errors
    if (error.name === "ValidationError") {
      console.error(
        "\nMONGOOSE VALIDATION DETAILS:"
      );

      Object.values(error.errors).forEach((item) => {
        console.error(
          `- ${item.path}: ${item.message}`
        );
      });
    }

    // MongoDB Atlas JSON Schema validation errors
    if (
      error.code === 121 &&
      error.errInfo?.details
    ) {
      console.error(
        "\nMONGODB ATLAS VALIDATION DETAILS:"
      );

      console.error(
        JSON.stringify(
          error.errInfo.details,
          null,
          2
        )
      );
    }

    // Other MongoDB errors
    if (error.code) {
      console.error(
        "\nMongoDB Error Code:",
        error.code
      );
    }

    console.error("====================================");

    process.exit(1);
  }
};

// ========================================
// INITIALIZE APPLICATION
// ========================================

startServer();
