import { Router } from "express";
import {
  getAddonGroups,
  getAddonGroupById,
  createAddonGroup,
  updateAddonGroup,
  deleteAddonGroup,
  copyAddonGroup,
} from "../controllers/addonController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

// Require admin/system auth for modifying addons
router.use(authenticate);

router.get("/", getAddonGroups);
router.get("/:id", getAddonGroupById);
router.post("/", createAddonGroup);
router.put("/:id", updateAddonGroup);
router.delete("/:id", deleteAddonGroup);
router.post("/:id/copy", copyAddonGroup);

export default router;
