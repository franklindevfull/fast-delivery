import { Router } from 'express';
import { getAllZones, createZone, updateZone, deleteZone, bulkImportZones } from '../controllers/deliveryZoneController.js';

const router = Router();

router.get('/', getAllZones);
router.post('/', createZone);
router.post('/import', bulkImportZones);
router.put('/:id', updateZone);
router.delete('/:id', deleteZone);

export default router;
