import express from "express";
import recordEntryRoutes from "./recordEntryRoutes.js";
import labourRoutes from "./labourRoutes.js";

const router = express.Router();

router.use("/records", recordEntryRoutes);
router.use("/labours", labourRoutes);

export default router;
