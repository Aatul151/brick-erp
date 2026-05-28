import express from "express";
import multer from "multer";
import { mkdirSync } from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../../middleware/auth.js";
import { zodValidator } from "../../middleware/zodvalidator.js";
import { loginSchema, passwordResetRequestSchema, passwordResetConfirmSchema, updateProfileSchema } from "../../utils/zodSchemaValidation.js";
import { loginLimiter, passwordResetLimiter } from "../../utils/rateLimiter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, "../../uploads/profile-pictures");
function ensureUploadDir(dir) { mkdirSync(dir, { recursive: true }); }

const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        ensureUploadDir(uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const originalName = file.originalname;
        const extension = path.extname(originalName); 
        const safeName = `${Date.now()}Z${String(_req?.user?.id)}P${extension}`;

        _req.body["filename"] = safeName;

        cb(null, safeName);
    },
});

const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    }
});

const router = express.Router();

router.post("/login", loginLimiter, zodValidator(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refreshAccessToken);
router.post("/password-reset/request", passwordResetLimiter, zodValidator(passwordResetRequestSchema), authController.requestPasswordReset);
router.post("/password-reset/confirm", zodValidator(passwordResetConfirmSchema), authController.resetPassword);
router.get("/profile", authenticate, authController.getProfile);
router.put("/profile", authenticate, zodValidator(updateProfileSchema), authController.updateProfile);
router.put("/profile-picture", authenticate, upload.single("files"), authController.updateProfilePicture);

export default router;
