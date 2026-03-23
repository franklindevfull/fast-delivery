import { Router } from 'express';
import * as backupController from '../controllers/backupController.js';

const router = Router();

router.get('/generate', backupController.generateBackup);

export default router;
