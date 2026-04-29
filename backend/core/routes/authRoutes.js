import express from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../../middleware/auth.js";
import { zodValidator } from "../../middleware/zodvalidator.js";
import { loginSchema, passwordResetRequestSchema, passwordResetConfirmSchema, updateProfileSchema } from "../../utils/zodSchemaValidation.js";
import { loginLimiter, passwordResetLimiter } from "../../utils/rateLimiter.js";

const router = express.Router();

router.post("/login", loginLimiter, zodValidator(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refreshAccessToken);
router.post("/password-reset/request", passwordResetLimiter, zodValidator(passwordResetRequestSchema), authController.requestPasswordReset);
router.post("/password-reset/confirm", zodValidator(passwordResetConfirmSchema), authController.resetPassword);
router.get("/profile", authenticate, authController.getProfile);
router.put("/profile", authenticate, zodValidator(updateProfileSchema), authController.updateProfile);

export default router;
