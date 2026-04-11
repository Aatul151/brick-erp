import express from 'express';
import formDefinitionRoutes from './formDefinitionRoutes.js';
import formEntryRoutes from './formEntryRoutes.js';
import fileRoutes from './fileRoutes.js';

const router = express.Router();

router.use('/form-definitions', formDefinitionRoutes);
router.use('/form-entries', formEntryRoutes);
router.use('/form-media', fileRoutes);

export default router;
