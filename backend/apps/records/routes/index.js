import express from "express";
import recordEntryRoutes from "./recordEntryRoutes.js";

const router = express.Router();

router.use("/records", recordEntryRoutes);

export default router;
