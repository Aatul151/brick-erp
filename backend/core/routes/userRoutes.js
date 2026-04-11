import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { createUserSchema, updateUserSchema } from '../../utils/validation.js';

const router = express.Router();

router.get('/', authenticate, requireRole('Site Admin', 'Client Admin'), userController.getUsers);
router.get('/:id', authenticate, requireRole('Site Admin', 'Client Admin'), userController.getUser);
router.post('/', authenticate, requireRole('Site Admin', 'Client Admin'), validate(createUserSchema), userController.createUser);
router.post('/invite', authenticate, requireRole('Site Admin', 'Client Admin'), userController.inviteUser);
router.put('/:id', authenticate, requireRole('Site Admin', 'Client Admin'), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', authenticate, requireRole('Site Admin', 'Client Admin'), userController.deleteUser);

export default router;
