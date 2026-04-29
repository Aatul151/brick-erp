import express from "express";
import * as roleController from "../controllers/roleController.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { zodValidator } from "../../middleware/zodvalidator.js";
import { createRoleSchema, updateRoleSchema, createPermissionSchema, updatePermissionSchema } from "../../utils/zodSchemaValidation.js";

const router = express.Router();

router.get("/roles", authenticate, roleController.getRoles);
router.get("/roles/:id", authenticate, roleController.getRole);
router.post("/roles", authenticate, requireRole("Site Admin"), zodValidator(createRoleSchema), roleController.createRole);
router.put("/roles/:id", authenticate, requireRole("Site Admin"), zodValidator(updateRoleSchema), roleController.updateRole);
router.delete("/roles/:id", authenticate, requireRole("Site Admin"), roleController.deleteRole);

router.get("/permissions", authenticate, requireRole("Site Admin"), roleController.getPermissions);
router.post("/permissions", authenticate, requireRole("Site Admin"), zodValidator(createPermissionSchema), roleController.createPermission);
router.put("/permissions/:id", authenticate, requireRole("Site Admin"), zodValidator(updatePermissionSchema), roleController.updatePermission);
router.delete("/permissions/:id", authenticate, requireRole("Site Admin"), roleController.deletePermission);

export default router;
