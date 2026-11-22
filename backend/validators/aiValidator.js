// Validate Route Coordinates
export const validateRoute = (req, res, next) => {
    const { start_lat, start_lon, end_lat, end_lon } = req.body;

    if (
        start_lat === undefined ||
        start_lon === undefined ||
        end_lat === undefined ||
        end_lon === undefined
    ) {
        return res.status(400).json({
            success: false,
            message: "All start and destination coordinates are required"
        });
    }

    const coordinates = [start_lat, start_lon, end_lat, end_lon];

    if (coordinates.some(value => typeof value !== "number" || !Number.isFinite(value))) {
        return res.status(400).json({
            success: false,
            message: "Coordinates must be valid numbers"
        });
    }

    if (
        start_lat < -90 || start_lat > 90 ||
        end_lat < -90 || end_lat > 90 ||
        start_lon < -180 || start_lon > 180 ||
        end_lon < -180 || end_lon > 180
    ) {
        return res.status(400).json({
            success: false,
            message: "Coordinates are out of valid range"
        });
    }

    next();
};

// Validate Traffic
export const validateTraffic = (req, res, next) => {
    const { vehicle_count } = req.body;

    if (
        !Number.isInteger(vehicle_count) ||
        vehicle_count < 0 ||
        vehicle_count > 500
    ) {
        return res.status(400).json({
            success: false,
            message: "Vehicle count must be an integer between 0 and 500"
        });
    }

    next();
};

// Validate Signal Plan
export const validateSignalPlan = (req, res, next) =>    {
    const { intersection_id, vehicle_count } = req.body;

    if (!intersection_id || typeof intersection_id !== "string") {
        return res.status(400).json({
            success: false,
            message: "Intersection ID is required"
        });
    }

    if (
        !Number.isInteger(vehicle_count) ||
        vehicle_count < 0 ||
        vehicle_count > 500
    ) {
        return res.status(400).json({
            success: false,
            message: "Vehicle count must be an integer between 0 and 500"
        });
    }

    next();
};

// Validate Simulation Signal Plan
export const validateSimulationSignal = (req, res, next) => {
    const { vehicle_count } = req.body;

    if (
        !Number.isInteger(vehicle_count) ||
        vehicle_count < 0 ||
        vehicle_count > 500
    ) {
        return res.status(400).json({
            success: false,
            message: "Vehicle count must be an integer between 0 and 500"
        });
    }

    next();
};

// Validate Session ID
export const validateSessionId = (req, res, next) => {
    const { sessionId } = req.params;

    if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Valid session ID is required"
        });
    }

    next();
};