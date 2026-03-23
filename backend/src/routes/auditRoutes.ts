import { Router } from 'express';
import * as auditController from '../controllers/auditController.js';
const router = Router();
router.get('/', auditController.getAuditLogs);
router.post('/', auditController.logAction);
export default router;
