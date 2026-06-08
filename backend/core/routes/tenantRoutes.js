import express from "express";
import * as tenantController from "../controllers/tenantController.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { zodValidator } from "../../middleware/zodvalidator.js";
import { createTenantSchema, updateTenantSchema } from "../../utils/zodSchemaValidation.js";

const router = express.Router();

router.post("/", tenantController.registerTenant);    
router.get("/stats", authenticate, tenantController.getTenantStats);
router.get("/", authenticate, requireRole("Site Admin", "Client Admin"), tenantController.getTenants);
router.get("/:id", authenticate, requireRole("Site Admin", "Client Admin"), tenantController.getTenant);
router.post("/", authenticate, requireRole("Site Admin"), zodValidator(createTenantSchema), tenantController.createTenant);
router.put("/:id", authenticate, requireRole("Site Admin"), zodValidator(updateTenantSchema), tenantController.updateTenant);
router.put("/:id/theme", authenticate, requireRole("Site Admin"), tenantController.updateTenantThemeSetting);
router.put("/my-theme/mode", authenticate, tenantController.updateMyTenantThemeMode);
router.post("/:id/suspend", authenticate, requireRole("Site Admin"), tenantController.suspendTenant);
router.post("/:id/activate", authenticate, requireRole("Site Admin"), tenantController.activateTenant);
router.delete("/:id", authenticate, requireRole("Site Admin"), tenantController.deleteTenant);

export default router;
