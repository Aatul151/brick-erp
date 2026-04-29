export const errorHandler = (err, req, res, next) => {
    console.error("Error:", err);

    if (err.name === "ZodError") {
        return res.status(400).json({
            error: "Validation failed",
            details: err.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message,
            })),
        });
    }

    if (err.code === "23505") {
        return res.status(409).json({
            error: "Duplicate entry",
            message: "A record with this value already exists",
        });
    }

    if (err.code === "23503") {
        return res.status(400).json({
            error: "Invalid reference",
            message: "Referenced record does not exist",
        });
    }

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack,
        }),
    });
};

export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl,
    });
};
