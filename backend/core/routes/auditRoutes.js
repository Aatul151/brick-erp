import express from "express";
import * as auditController from "../controllers/auditController.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, requireRole("Site Admin", "Client Admin"), auditController.getAuditLogs);
router.get("/stats", authenticate, requireRole("Site Admin", "Client Admin"), auditController.getAuditLogStats);

export default router;
