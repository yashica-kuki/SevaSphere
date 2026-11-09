
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";

import {
  getAdminVerificationQueue,
  getAdminVerificationDetails,
  startNGOVerificationReview,
  reviewNGODocument,
  decideNGOVerification,
  downloadAdminNGODocument,
} from "../controllers/adminVerificationController.js";

const router = express.Router();

// Every endpoint in this router requires an authenticated admin.
router.use(protect, authorize("ADMIN"));

// List applications awaiting review, or filter by ?status=VERIFIED
router.get("/", getAdminVerificationQueue);

// Download a private NGO document.
router.get("/documents/:documentId/download", downloadAdminNGODocument);

// View one NGO application.
router.get("/:ngoId", getAdminVerificationDetails);

// Move SUBMITTED application to UNDER_REVIEW.
router.post("/:ngoId/start-review", startNGOVerificationReview);

// Review an individual document.
router.patch(
  "/:ngoId/documents/:documentId",
  reviewNGODocument
);

// Final NGO verification decision.
router.patch("/:ngoId/decision", decideNGOVerification);

export default router;
