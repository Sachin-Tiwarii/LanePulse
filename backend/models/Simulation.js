
import mongoose from "mongoose";

const simulationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        sessionId: {
            type: String,
            required: true,
            unique: true
        },
        startLocation: {
            type: Object,
            required: true
        },
        destination: {
            type: Object,
            required: true
        },
        route: {
            type: Object,
            default: {}
        },
        status: {
            type: String,
            enum: ["running", "completed", "failed"],
            default: "running"
        }
    },
    {
        timestamps: true
    }
);

const Simulation = mongoose.model("Simulation", simulationSchema);

export default Simulation;
