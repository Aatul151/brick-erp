import express from "express";
import * as dashboardController from "../controllers/dashboardController.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

const router = express.Router();

router.get("/count", authenticate, dashboardController.getCountStatistics);
router.get("/chart", authenticate, dashboardController.getChartStatistics);
router.get("/labour/activity", authenticate, dashboardController.getActivities);

export default router;