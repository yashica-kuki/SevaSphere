
import path from "path";
import fs from "fs/promises";
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const uploadDirectory = path.resolve(
  process.cwd(),
  "private_uploads",
  "ngo-documents"
);

const requiredDocumentTypes = [
  "REGISTRATION_CERTIFICATE",
  "PAN_CARD",
  "BANK_PROOF",
];

const validUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const writeAuditLog = async (req, action, entity, entityId, metadata = {}) => {
  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action,
      entity,
      entityId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      metadata,
    },
  });
};

const serializeDocument = (document) => ({
  id: document.id,
  type: document.type,
  fileName: document.fileName,
  fileSize: document.fileSize,
  mimeType: document.mimeType,
  reviewStatus: document.reviewStatus,
  reviewReason: document.reviewReason,
  verified: document.verified,
  verifiedAt: document.verifiedAt,
  reviewedAt: document.reviewedAt,
  createdAt: document.createdAt,
});

export const getAdminVerificationQueue = asyncHandler(
  async (req, res) => {
    const status = req.query.status;

    const allowedStatuses = [
      "DRAFT",
      "PENDING",
      "SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
      "ACTION_REQUIRED",
      "REJECTED",
      "SUSPENDED",
    ];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid NGO status filter.",
      });
    }

    const ngos = await prisma.nGOProfile.findMany({
      where: status ? { status } : {
        status: {
          in: ["SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            fileName: true,
            reviewStatus: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { submittedAt: "asc" },
        { updatedAt: "asc" },
      ],
    });

    res.json({
      success: true,
      count: ngos.length,
      data: ngos.map((ngo) => ({
        id: ngo.id,
        organizationName: ngo.organizationName,
        legalName: ngo.legalName,
        registrationNumber: ngo.registrationNumber,
        city: ngo.city,
        state: ngo.state,
        status: ngo.status,
        submittedAt: ngo.submittedAt,
        reviewedAt: ngo.reviewedAt,
        reviewNote: ngo.reviewNote,
        user: ngo.user,
        documents: ngo.documents,
      })),
    });
  }
);

export const getAdminVerificationDetails = asyncHandler(
  async (req, res) => {
    const { ngoId } = req.params;

    if (!validUuid(ngoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid NGO ID.",
      });
    }

    const ngo = await prisma.nGOProfile.findUnique({
      where: { id: ngoId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO application not found.",
      });
    }

    const {
      documents,
      minimumDonationPaise,
      ...profile
    } = ngo;

    res.json({
      success: true,
      data: {
        ...profile,
        minimumDonation:
          minimumDonationPaise === null
            ? null
            : Number(minimumDonationPaise) / 100,
        documents: documents.map(serializeDocument),
      },
    });
  }
);

export const startNGOVerificationReview = asyncHandler(
  async (req, res) => {
    const { ngoId } = req.params;

    if (!validUuid(ngoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid NGO ID.",
      });
    }

    const ngo = await prisma.nGOProfile.findUnique({
      where: { id: ngoId },
    });

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO application not found.",
      });
    }

    if (ngo.status !== "SUBMITTED") {
      return res.status(400).json({
        success: false,
        message: "Only submitted applications can be moved under review.",
      });
    }

    const updated = await prisma.nGOProfile.update({
      where: { id: ngoId },
      data: {
        status: "UNDER_REVIEW",
      },
    });

    await writeAuditLog(
      req,
      "NGO_VERIFICATION_STARTED",
      "NGOProfile",
      ngoId
    );

    res.json({
      success: true,
      message: "NGO application moved under review.",
      data: {
        status: updated.status,
      },
    });
  }
);

export const reviewNGODocument = asyncHandler(async (req, res) => {
  const { ngoId, documentId } = req.params;
  const { decision, reason } = req.body;

  if (!validUuid(ngoId) || !validUuid(documentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid NGO or document ID.",
    });
  }

  const allowedDecisions = [
    "APPROVED",
    "REJECTED",
    "ACTION_REQUIRED",
  ];

  if (!allowedDecisions.includes(decision)) {
    return res.status(400).json({
      success: false,
      message: "Decision must be APPROVED, REJECTED or ACTION_REQUIRED.",
    });
  }

  if (
    decision !== "APPROVED" &&
    (!reason || typeof reason !== "string" || !reason.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "A reason is required when a document is not approved.",
    });
  }

  const ngo = await prisma.nGOProfile.findUnique({
    where: { id: ngoId },
  });

  if (!ngo) {
    return res.status(404).json({
      success: false,
      message: "NGO application not found.",
    });
  }

  if (!["SUBMITTED", "UNDER_REVIEW"].includes(ngo.status)) {
    return res.status(400).json({
      success: false,
      message: "Documents can only be reviewed for submitted applications under review.",
    });
  }

  const document = await prisma.nGODocument.findFirst({
    where: {
      id: documentId,
      ngoId,
    },
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: "Document not found for this NGO.",
    });
  }

  const updated = await prisma.nGODocument.update({
    where: { id: documentId },
    data: {
      reviewStatus: decision,
      reviewReason: decision === "APPROVED" ? null : reason.trim(),
      reviewedAt: new Date(),
      verified: decision === "APPROVED",
      verifiedAt: decision === "APPROVED" ? new Date() : null,
    },
  });

  await writeAuditLog(
    req,
    "NGO_DOCUMENT_REVIEWED",
    "NGODocument",
    documentId,
    {
      ngoId,
      documentType: document.type,
      decision,
      reason: reason?.trim() || null,
    }
  );

  res.json({
    success: true,
    message: `Document ${decision.toLowerCase()} successfully.`,
    data: serializeDocument(updated),
  });
});

export const decideNGOVerification = asyncHandler(async (req, res) => {
  const { ngoId } = req.params;
  const { decision, note } = req.body;

  if (!validUuid(ngoId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid NGO ID.",
    });
  }

  const allowedDecisions = [
    "APPROVE",
    "REJECT",
    "ACTION_REQUIRED",
  ];

  if (!allowedDecisions.includes(decision)) {
    return res.status(400).json({
      success: false,
      message: "Decision must be APPROVE, REJECT or ACTION_REQUIRED.",
    });
  }

  if (
    decision !== "APPROVE" &&
    (!note || typeof note !== "string" || !note.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "A review note is required for rejection or corrections.",
    });
  }

  const ngo = await prisma.nGOProfile.findUnique({
    where: { id: ngoId },
    include: {
      documents: {
        where: {
          type: { in: requiredDocumentTypes },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!ngo) {
    return res.status(404).json({
      success: false,
      message: "NGO application not found.",
    });
  }

  if (!["SUBMITTED", "UNDER_REVIEW"].includes(ngo.status)) {
    return res.status(400).json({
      success: false,
      message: "This application is not available for a final review decision.",
    });
  }

  if (decision === "APPROVE") {
    const latestDocuments = {};

    for (const document of ngo.documents) {
      if (!latestDocuments[document.type]) {
        latestDocuments[document.type] = document;
      }
    }

    const missingOrUnapproved = requiredDocumentTypes.filter(
      (type) =>
        !latestDocuments[type] ||
        latestDocuments[type].reviewStatus !== "APPROVED"
    );

    if (missingOrUnapproved.length) {
      return res.status(400).json({
        success: false,
        message: "All latest required documents must be approved before NGO verification.",
        data: {
          documents: missingOrUnapproved,
        },
      });
    }
  }

  const nextStatus =
    decision === "APPROVE"
      ? "VERIFIED"
      : decision === "REJECT"
        ? "REJECTED"
        : "ACTION_REQUIRED";

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.nGOProfile.update({
      where: { id: ngoId },
      data: {
        status: nextStatus,
        reviewedAt: now,
        reviewNote: note?.trim() || null,
        verifiedAt: decision === "APPROVE" ? now : null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: req.user.id,
        action: `NGO_VERIFICATION_${decision}`,
        entity: "NGOProfile",
        entityId: ngoId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
        metadata: {
          previousStatus: ngo.status,
          nextStatus,
          note: note?.trim() || null,
        },
      },
    });

    return result;
  });

  res.json({
    success: true,
    message: `NGO verification ${decision.toLowerCase()} successfully.`,
    data: {
      ngoId: updated.id,
      status: updated.status,
      reviewedAt: updated.reviewedAt,
      reviewNote: updated.reviewNote,
    },
  });
});

export const downloadAdminNGODocument = asyncHandler(
  async (req, res) => {
    const { documentId } = req.params;

    if (!validUuid(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await prisma.nGODocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const safeFileName = path.basename(document.fileUrl);

    if (!safeFileName || safeFileName !== document.fileUrl) {
      return res.status(400).json({
        success: false,
        message: "Invalid document storage reference.",
      });
    }

    const filePath = path.join(uploadDirectory, safeFileName);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: "Stored document file not found.",
      });
    }

    res.download(filePath, document.fileName);
  }
);
