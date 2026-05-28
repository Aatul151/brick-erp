import express from "express";
import * as controller from "../controllers/labourController.js";
import { authenticate } from "../../../middleware/auth.js";

const router = express.Router();

router.get("/get", authenticate, controller.listLabours);
router.get("/get/:id", authenticate, controller.getLabour);
router.post("/create", authenticate, controller.createLabour);
router.put("/update/:id", authenticate, controller.updateLabour);
router.delete("/delete/:id", authenticate, controller.deleteLabour);

export default router;
