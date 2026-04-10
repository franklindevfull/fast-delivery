import { Router } from 'express';
import { getAllZones, createZone, updateZone, deleteZone } from '../controllers/deliveryZoneController.js';

const router = Router();

router.get('/', getAllZones);
router.post('/', createZone);
router.put('/:id', updateZone);
router.delete('/:id', deleteZone);

export default router;
