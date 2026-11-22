
import "dotenv/config";

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import notFoundMiddleware from "./middleware/notFoundMiddleware.js";
import apiRoutes from "./routes/apiRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", apiRoutes);

// Home Route
app.get("/", (req, res) => {
    res.send("Welcome to LanePulse Backend!");
});

// Health Check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "LanePulse Backend is running!",
    });
});

// Not Found Middleware
app.use(notFoundMiddleware);

// Error Middleware
app.use(errorMiddleware);

// Server Port
const PORT = process.env.PORT || 5000;

// Start Server
const startServer = async () => {
    try {
        if (process.env.MONGODB_URI) {
            await connectDB();
        } else {
            console.warn("MongoDB URI not found. Starting without database.");
        }

        app.listen(PORT, () => {
            console.log(`LanePulse Backend running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
