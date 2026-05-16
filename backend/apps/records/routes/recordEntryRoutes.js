import express from "express";
import * as controller from "../controllers/recordEntryController.js";
import { authenticate } from "../../../middleware/auth.js";

const router = express.Router();

router.get("/get", authenticate, controller.listRecords);
router.get("/get/:id", authenticate, controller.getRecord);
router.post("/create", authenticate, controller.createRecord);
router.put("/update/:id", authenticate, controller.updateRecord);
router.delete("/delete/:id", authenticate, controller.deleteRecord);

export default router;
