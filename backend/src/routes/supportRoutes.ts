import { Router } from 'express';
import * as supportController from '../controllers/supportController.js';

const router = Router();

router.get('/', supportController.getMessages);
router.post('/', supportController.sendMessage);
router.delete('/', supportController.clearMessages);

export default router;
