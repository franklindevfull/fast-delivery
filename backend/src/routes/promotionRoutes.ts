import { Router } from 'express';
import * as promotionController from '../controllers/promotionController.js';

const router = Router();

router.get('/', promotionController.getAllCoupons);
router.post('/', promotionController.saveCoupon);
router.delete('/:id', promotionController.deleteCoupon);
router.post('/validate', promotionController.validateCoupon);

export default router;
