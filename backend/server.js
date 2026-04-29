import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({
    path: join(__dirname, "..", ".env"),
});

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { testConnection } from "./models/db.js";
import { seedDatabase } from "./seeds/seedData.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./utils/rateLimiter.js";

import coreRoutes from "./core/routes/index.js";
import formStudioRoutes from "./apps/form-studio/routes/index.js";

const app = express();
const PORT = process.env.BACKEND_PORT;

app.use(helmet());
app.use(
    cors({
        origin: "*",
    }),
);
app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    }),
);
app.use(morgan("combined"));

app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

app.use("/api", coreRoutes);
app.use("/api", formStudioRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
    try {
        console.log("Testing database connection...");
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error("Failed to connect to database. Exiting...");
            process.exit(1);
        }

        console.log("Running database migrations and seeding...");
        await seedDatabase();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
