import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';

const router = Router();

router.get('/:driverId', chatController.getMessages);
router.post('/', chatController.saveMessage);

export default router;
