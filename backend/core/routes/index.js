import express from "express";
import authRoutes from "./authRoutes.js";
import tenantRoutes from "./tenantRoutes.js";
import userRoutes from "./userRoutes.js";
import roleRoutes from "./roleRoutes.js";
import moduleRoutes from "./moduleRoutes.js";
import auditRoutes from "./auditRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/tenants", tenantRoutes);
router.use("/users", userRoutes);
router.use("/", roleRoutes);
router.use("/modules", moduleRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
