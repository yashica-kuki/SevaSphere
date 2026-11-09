
import { z } from "zod";

export const updateNGOProfileSchema = z.object({
  organizationName: z.string().trim().min(2).max(150),
  legalName: z.string().trim().max(150).optional().nullable(),
  registrationNumber: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  mission: z.string().trim().max(2000).optional().nullable(),
  vision: z.string().trim().max(2000).optional().nullable(),
  website: z.string().trim().url().optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(25).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().min(2).max(100),
  minimumDonation: z.number().positive().max(10000000).optional().nullable(),
  logoUrl: z
  .string()
  .trim()
  .refine((v) => v === "" || /^\/images\//.test(v) || /^https?:\/\//.test(v), "Must be an https URL or an /images/ path")
  .optional()
  .nullable(),
  galleryUrls: z.array(z.string().trim().url()).max(10).optional(),
});

export const updateNGOCausesSchema = z.object({
  causeIds: z
    .array(z.string().uuid())
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Duplicate causes are not allowed.",
    }),
});


const initiativeDateSchema = z.string().date().nullable().optional();

const initiativeFields = {
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(5000),
  causeId: z.string().uuid(),
  targetAmount: z.number().positive().max(100000000).nullable().optional(),
  startDate: initiativeDateSchema,
  endDate: initiativeDateSchema,
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
};

export const createNGOInitiativeSchema = z.object(initiativeFields).refine(
  (data) =>
    !data.startDate ||
    !data.endDate ||
    data.endDate >= data.startDate,
  {
    message: "End date cannot be earlier than start date.",
    path: ["endDate"],
  }
);

export const updateNGOInitiativeSchema = z
  .object(initiativeFields)
  .partial()
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      data.endDate >= data.startDate,
    {
      message: "End date cannot be earlier than start date.",
      path: ["endDate"],
    }
  );
