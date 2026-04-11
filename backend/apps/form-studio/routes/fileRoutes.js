import express from 'express';
import multer from 'multer';
import { authenticate } from '../../../middleware/auth.js';
import {
  createUploadMiddleware,
  uploadFormFiles,
  downloadFile
} from '../controllers/fileUploadController.js';

const router = express.Router();
const upload = createUploadMiddleware(multer);

router.post('/file-upload', authenticate, upload.array('files', 20), uploadFormFiles);
router.get('/files/:publicId', authenticate, downloadFile);

export default router;
