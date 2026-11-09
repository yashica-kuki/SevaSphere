
import express from "express";
import {
  register,
  login,
  getMe,
  logout,
  changePassword,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../validators/authValidator.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", protect, getMe);
router.post("/logout", logout);
router.post("/password", protect, validate(changePasswordSchema), changePassword);

export default router;
