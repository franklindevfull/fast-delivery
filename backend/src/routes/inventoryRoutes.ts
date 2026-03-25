import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
const router = Router();
router.get('/', inventoryController.getAllInventory);
router.get('/movements', inventoryController.getInventoryMovements);
router.get('/low-stock', inventoryController.getLowStockItems);
router.post('/', inventoryController.saveInventoryItem);
router.delete('/:id', inventoryController.deleteInventoryItem);
export default router;
