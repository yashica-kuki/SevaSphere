import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import * as admin from "../controllers/adminController.js";
import * as grids from "../controllers/gridControllers.js";

const router = express.Router();
router.use(protect, authorize("ADMIN"));

router.get("/dashboard", admin.getDashboard);

router.get("/grids/users", grids.adminUsersGrid);
router.get("/grids/verifications", grids.adminVerificationGrid);
router.get("/grids/donations", grids.adminDonationsGrid);
router.get("/grids/payments", grids.adminPaymentsGrid);
router.get("/grids/audit-logs", grids.adminAuditGrid);
router.get("/grids/executions", grids.adminExecutionsGrid);
router.get("/grids/impact-reports", grids.adminReportsGrid);
router.get("/grids/enquiries", grids.adminEnquiriesGrid);
router.get("/grids/payouts", grids.adminPayoutsGrid);

router.patch("/users/:id/status", admin.setUserStatus);

router.get("/donations/:id", admin.getDonationDetail);
router.post("/donations/:id/refund", admin.refundDonation);
router.post("/wallet/reverse-topup/:entryId", admin.reverseTopUpEntry);
router.post("/wallet/adjust", admin.adjustWalletBalance);

router.get("/agent/executions/:id", admin.getExecutionDetail);

router.get("/impact-reports/:id", admin.getReportForReview);
router.post("/impact-reports/:id/review", admin.reviewReport);

router.patch("/enquiries/:id", admin.updateEnquiry);
router.patch("/payouts/:id", admin.updatePayout);

export default router;
