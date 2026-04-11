import express from 'express';
import * as moduleController from '../controllers/moduleController.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { createModuleSchema, updateModuleSchema } from '../../utils/validation.js';

const router = express.Router();

router.get('/', authenticate, moduleController.getModules);
router.get('/:id', authenticate, moduleController.getModule);
router.post('/', authenticate, requireRole('Site Admin'), validate(createModuleSchema), moduleController.createModule);
router.put('/:id', authenticate, requireRole('Site Admin'), validate(updateModuleSchema), moduleController.updateModule);
router.delete('/:id', authenticate, requireRole('Site Admin'), moduleController.deleteModule);

export default router;
