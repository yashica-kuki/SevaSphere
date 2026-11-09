import express from "express";

import {
  listCauses,
  getCauseDetails,
  listNGOs,
  getNGODetails,
  getImpactOverview,
  listImpactStories,
} from "../controllers/publicController.js";

const router = express.Router();

router.get("/causes", listCauses);
router.get("/causes/:slug", getCauseDetails);

router.get("/ngos", listNGOs);
router.get("/ngos/:id", getNGODetails);

router.get("/impact", getImpactOverview);
router.get("/stories", listImpactStories);

export default router;