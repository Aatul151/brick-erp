import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || 5),
    message: "Too many login attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

export const passwordResetLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW || 60) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_MAX || 3),
    message: "Too many password reset requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.body.email || req.ip,
});

export const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW || 60) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_API_MAX || 1000),
    message: "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/api/health",
});
