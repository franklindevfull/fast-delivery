import express from 'express';
import { printReceipt } from '../controllers/printController.js';

const router = express.Router();

router.post('/receipt', printReceipt);

export default router;
