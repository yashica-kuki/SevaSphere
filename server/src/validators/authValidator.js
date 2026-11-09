
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  role: z.enum(["DONOR", "NGO"]).optional().default("DONOR"),
  phone: z.string().trim().max(20).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  organizationName: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  referralCode: z.string().trim().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8).max(72),
});
