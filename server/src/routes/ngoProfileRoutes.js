
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import {
  getNGODonations,
  getNGOPayouts,
} from "../controllers/ngoDonationController.js";

import {
  getNGOCauses,
  updateNGOCauses,
} from "../controllers/ngoCauseController.js";

import {
  getNGOInitiatives,
  createNGOInitiative,
  updateNGOInitiative,
  deleteNGOInitiative,
} from "../controllers/ngoInitiativeController.js";

import {
  updateNGOCausesSchema,
  createNGOInitiativeSchema,
  updateNGOInitiativeSchema,
} from "../validators/ngoValidator.js";

import {
  getNGOProfile,
  updateNGOProfile,
} from "../controllers/ngoProfileController.js";

import {
  getNGOVerification,
  submitNGOVerification,
} from "../controllers/ngoVerificationController.js";

import evidenceUpload from "../middleware/evidenceUpload.js";
import * as impact from "../controllers/ngoImpactController.js";
import * as grids from "../controllers/gridControllers.js";

const router = express.Router();

router.use(protect, authorize("NGO"));

router.get("/profile", getNGOProfile);

router.get("/causes", getNGOCauses);
router.put("/causes", validate(updateNGOCausesSchema), updateNGOCauses);

router.get("/initiatives", getNGOInitiatives);
router.post(
  "/initiatives",
  validate(createNGOInitiativeSchema),
  createNGOInitiative
);
router.patch(
  "/initiatives/:initiativeId",
  validate(updateNGOInitiativeSchema),
  updateNGOInitiative
);
router.delete("/initiatives/:initiativeId", deleteNGOInitiative);

router.get("/verification", getNGOVerification);
router.post("/verification/submit", submitNGOVerification);
router.get("/donations", getNGODonations);
router.get("/payouts", getNGOPayouts);

router.get("/analytics", impact.getAnalytics);

router.get("/impact-reports/allocations", impact.listAllocationsForReports);
router.post("/impact-reports", impact.createReport);
router.get("/impact-reports/:id", impact.getReport);
router.put("/impact-reports/:id", impact.updateReport);
router.post("/impact-reports/:id/submit", impact.submitReport);
router.delete("/impact-reports/:id", impact.deleteReport);
router.post("/impact-reports/:id/evidence", evidenceUpload.single("file"), impact.addEvidence);
router.delete("/impact-reports/:id/evidence/:evidenceId", impact.removeEvidence);

router.get("/grids/donations", grids.ngoDonationsGrid);
router.get("/grids/payouts", grids.ngoPayoutsGrid);
router.get("/grids/impact-reports", grids.ngoReportsGrid);

export default router;
