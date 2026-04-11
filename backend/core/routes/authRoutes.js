import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { loginSchema, passwordResetRequestSchema, passwordResetConfirmSchema, updateProfileSchema } from '../../utils/validation.js';
import { loginLimiter, passwordResetLimiter } from '../../utils/rateLimiter.js';

const router = express.Router();

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshAccessToken);
router.post('/password-reset/request', passwordResetLimiter, validate(passwordResetRequestSchema), authController.requestPasswordReset);
router.post('/password-reset/confirm', validate(passwordResetConfirmSchema), authController.resetPassword);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

export default router;
