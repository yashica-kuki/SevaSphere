import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { getNGODashboard } from "../controllers/ngoDashboardController.js";
import { getDonorDashboard } from "../controllers/donorController.js";

const router = express.Router();

router.get("/donor", protect, authorize("DONOR"), getDonorDashboard);

router.get("/ngo", protect, authorize("NGO"), getNGODashboard);

router.get("/admin", protect, authorize("ADMIN"), (req, res) => {
  res.json({
    success: true,
    message: "Admin dashboard access granted",
    user: req.user,
  });
});

export default router;