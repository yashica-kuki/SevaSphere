import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { createEnquiry, myEnquiries } from "../controllers/enquiryController.js";
import { downloadEvidence } from "../controllers/ngoImpactController.js";

const router = express.Router();
router.post("/enquiries", protect, authorize("DONOR", "NGO"), createEnquiry);
router.get("/enquiries", protect, authorize("DONOR", "NGO"), myEnquiries);
router.get("/impact-evidence/:evidenceId/download", protect, authorize("NGO", "ADMIN"), downloadEvidence);
export default router;
