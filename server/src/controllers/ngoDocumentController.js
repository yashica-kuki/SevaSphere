
import path from "path";
import fs from "fs/promises";
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const uploadDirectory = path.resolve(
  process.cwd(),
  "private_uploads",
  "ngo-documents"
);

const getNGO = async (userId) => {
  return prisma.nGOProfile.findUnique({
    where: { userId },
  });
};

const serializeDocument = (document) => ({
  id: document.id,
  type: document.type,
  fileName: document.fileName,
  reviewStatus: document.reviewStatus,
  reviewReason: document.reviewReason,
  fileSize: document.fileSize,
  mimeType: document.mimeType,
  createdAt: document.createdAt,
  reviewedAt: document.reviewedAt,
});

export const getNGODocuments = asyncHandler(async (req, res) => {
  const ngo = await getNGO(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const documents = await prisma.nGODocument.findMany({
    where: { ngoId: ngo.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    data: documents.map(serializeDocument),
  });
});

export const uploadNGODocumentFile = asyncHandler(async (req, res) => {
  const ngo = await getNGO(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  if (!req.file) {
    res.status(400);
    throw new Error("Please select a document to upload.");
  }

  const { type } = req.body;

  const allowedTypes = [
    "REGISTRATION_CERTIFICATE",
    "TAX_CERTIFICATE",
    "PAN_CARD",
    "BANK_PROOF",
    "OTHER",
  ];

  if (!allowedTypes.includes(type)) {
    await fs.unlink(req.file.path).catch(() => {});
    res.status(400);
    throw new Error("Invalid document type.");
  }

  const document = await prisma.nGODocument.create({
    data: {
      ngoId: ngo.id,
      type,
      fileName: path.basename(req.file.originalname),
      fileUrl: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      reviewStatus: "PENDING",
      verified: false,
    },
  });

  res.status(201).json({
    success: true,
    message: "Document uploaded successfully.",
    data: serializeDocument(document),
  });
});

export const downloadNGODocument = asyncHandler(async (req, res) => {
  const ngo = await getNGO(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const document = await prisma.nGODocument.findFirst({
    where: {
      id: req.params.documentId,
      ngoId: ngo.id,
    },
  });

  if (!document) {
    res.status(404);
    throw new Error("Document not found.");
  }

  const safeFileName = path.basename(document.fileUrl);

  if (!safeFileName || safeFileName !== document.fileUrl) {
    res.status(400);
    throw new Error("Invalid document storage reference.");
  }

  const filePath = path.join(uploadDirectory, safeFileName);

  try {
    await fs.access(filePath);
  } catch {
    res.status(404);
    throw new Error("Stored document file not found.");
  }

  res.download(filePath, document.fileName);
});
