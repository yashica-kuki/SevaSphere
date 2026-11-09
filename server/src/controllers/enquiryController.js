import { z } from "zod";
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const schema = z.object({ subject: z.string().trim().min(3).max(150), message: z.string().trim().min(10).max(5000) });

// Enquiry from a signed-in donor or NGO; identity comes from the session, never the request body.
export const createEnquiry = asyncHandler(async (req, res) => {
  const b = schema.parse(req.body);
  const m = await prisma.contactMessage.create({
    data: { name: req.user.name.slice(0, 100), email: req.user.email, subject: b.subject, message: b.message, userId: req.user.id, role: req.user.role },
    select: { id: true, subject: true, status: true, createdAt: true },
  });
  res.status(201).json({ success: true, message: "Your enquiry has been sent to the SevaSphere team", data: m });
});

export const myEnquiries = asyncHandler(async (req, res) => {
  const rows = await prisma.contactMessage.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, subject: true, status: true, createdAt: true } });
  res.json({ success: true, data: rows });
});
