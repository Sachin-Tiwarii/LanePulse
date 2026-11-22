const errorMiddleware = (err, req, res, next) => {
    const statusCode = err.statusCode || res.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message:
            statusCode === 500
                ? "Internal Server Error"
                : err.message || "Something went wrong"
    });
};

export default errorMiddleware;