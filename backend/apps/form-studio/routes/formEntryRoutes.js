import express from 'express';
import * as controller from '../controllers/formEntryController.js';
import { authenticate } from '../../../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, controller.listFormEntries);
router.post('/', authenticate, controller.createFormEntry);
router.put('/:id', authenticate, controller.updateFormEntry);
router.delete('/:id', authenticate, controller.deleteFormEntry);

export default router;
