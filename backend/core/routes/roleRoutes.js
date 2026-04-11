import express from 'express';
import * as roleController from '../controllers/roleController.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { createRoleSchema, updateRoleSchema, createPermissionSchema, updatePermissionSchema } from '../../utils/validation.js';

const router = express.Router();

router.get('/roles', authenticate, roleController.getRoles);
router.get('/roles/:id', authenticate, roleController.getRole);
router.post('/roles', authenticate, requireRole('Site Admin'), validate(createRoleSchema), roleController.createRole);
router.put('/roles/:id', authenticate, requireRole('Site Admin'), validate(updateRoleSchema), roleController.updateRole);
router.delete('/roles/:id', authenticate, requireRole('Site Admin'), roleController.deleteRole);

router.get('/permissions', authenticate, requireRole('Site Admin'), roleController.getPermissions);
router.post('/permissions', authenticate, requireRole('Site Admin'), validate(createPermissionSchema), roleController.createPermission);
router.put('/permissions/:id', authenticate, requireRole('Site Admin'), validate(updatePermissionSchema), roleController.updatePermission);
router.delete('/permissions/:id', authenticate, requireRole('Site Admin'), roleController.deletePermission);

export default router;
