import express from "express";
import * as controller from "../controllers/formDefinitionController.js";
import { authenticate, requireRole } from "../../../middleware/auth.js";

const router = express.Router();
const formEditors = ["Site Admin", "Client Admin"];

router.get("/", authenticate, controller.listFormDefinitions);
router.get("/menu", authenticate, controller.listFormDefinitionsWithMaster);
router.get("/name/:name", authenticate, controller.getFormDefinitionByName);
router.get("/:id", authenticate, controller.getFormDefinitionById);
router.post("/", authenticate, requireRole(...formEditors), controller.createFormDefinition);
router.put("/:id", authenticate, requireRole(...formEditors), controller.updateFormDefinition);
router.delete("/:id", authenticate, requireRole(...formEditors), controller.deleteFormDefinition);

export default router;
