import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import * as donor from "../controllers/donorController.js";
import * as agent from "../controllers/agentController.js";
import * as schedule from "../controllers/scheduleController.js";
import * as paypal from "../controllers/paypalController.js";
import * as grids from "../controllers/gridControllers.js";

const router = express.Router();
router.use(protect, authorize("DONOR"));

router.get("/dashboard", donor.getDonorDashboard);
router.get("/profile", donor.getProfile);
router.put("/profile", donor.updateProfile);
router.get("/preferences", donor.getPreferences);
router.put("/preferences", donor.updatePreferences);
router.get("/causes", donor.listCauses);

router.get("/ngos", donor.discoverNgos);
router.get("/ngos/:id", donor.getNgoDetail);
router.post("/favorites/:ngoId", donor.addFavorite);
router.delete("/favorites/:ngoId", donor.removeFavorite);

router.get("/policy", donor.getPolicy);
router.post("/policy/authorize", donor.authorize);
router.post("/policy/pause", donor.changePolicyState("pause"));
router.post("/policy/resume", donor.changePolicyState("resume"));
router.post("/policy/revoke", donor.changePolicyState("revoke"));

router.get("/wallet", donor.getWallet);
router.post("/wallet/topup", donor.topUpWallet);

router.post("/agent/preview", agent.previewAllocation);
router.post("/agent/execute", agent.executeAllocationRequest);
router.get("/agent/executions", agent.listExecutions);
router.get("/agent/executions/:id", agent.getExecution);

router.get("/schedules", schedule.listSchedules);
router.get("/schedules/events", schedule.scheduleEvents);
router.post("/schedules", schedule.createSchedule);
router.put("/schedules/:id", schedule.updateSchedule);
router.post("/schedules/:id/pause", schedule.pauseSchedule);
router.post("/schedules/:id/resume", schedule.resumeSchedule);
router.post("/schedules/:id/cancel", schedule.cancelSchedule);
router.post("/schedules/:id/run-now", schedule.runScheduleNow);

router.get("/ambassador", donor.getAmbassador);

router.get("/grids/donations", grids.donorDonationsGrid);
router.get("/grids/wallet", grids.donorWalletGrid);
router.get("/grids/allocations", grids.donorAllocationsGrid);

// PayPal Sandbox (USD) — separate from the simulated INR wallet.
router.get("/paypal/config", paypal.getConfig);
router.get("/paypal/payments", paypal.listMyPayments);
router.post("/paypal/create-order", paypal.createOrder);
router.post("/paypal/capture-order", paypal.captureOrder);
router.post("/paypal/cancel-order", paypal.cancelOrder);
router.post("/paypal/fail-order", paypal.failOrder);

export default router;
