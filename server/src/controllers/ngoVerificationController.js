
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const requiredDocumentTypes = [
  "REGISTRATION_CERTIFICATE",
  "PAN_CARD",
  "BANK_PROOF",
];

const requiredProfileFields = [
  "organizationName",
  "legalName",
  "registrationNumber",
  "description",
  "mission",
  "vision",
  "phone",
  "address",
  "city",
  "state",
  "country",
];

const getNGO = async (userId) => {
  return prisma.nGOProfile.findUnique({
    where: { userId },
  });
};

const getLatestRequiredDocuments = async (ngoId) => {
  const documents = await prisma.nGODocument.findMany({
    where: {
      ngoId,
      type: { in: requiredDocumentTypes },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestByType = {};

  for (const document of documents) {
    if (!latestByType[document.type]) {
      latestByType[document.type] = document;
    }
  }

  return latestByType;
};

const buildChecklist = (ngo, latestDocuments) => {
  const profile = requiredProfileFields.map((field) => ({
    field,
    complete:
      typeof ngo[field] === "string" && ngo[field].trim().length > 0,
  }));

  const documents = requiredDocumentTypes.map((type) => {
    const document = latestDocuments[type];

    return {
      type,
      uploaded: Boolean(document),
      reviewStatus: document?.reviewStatus || null,
      fileName: document?.fileName || null,
      complete:
        Boolean(document) &&
        !["REJECTED", "ACTION_REQUIRED"].includes(
          document.reviewStatus
        ),
    };
  });

  return {
    profile,
    documents,
    profileComplete: profile.every((item) => item.complete),
    documentsComplete: documents.every((item) => item.complete),
  };
};

export const getNGOVerification = asyncHandler(async (req, res) => {
  const ngo = await getNGO(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const latestDocuments = await getLatestRequiredDocuments(ngo.id);
  const checklist = buildChecklist(ngo, latestDocuments);

  res.json({
    success: true,
    data: {
      status: ngo.status,
      submittedAt: ngo.submittedAt,
      reviewedAt: ngo.reviewedAt,
      reviewNote: ngo.reviewNote,
      checklist,
      canSubmit:
        checklist.profileComplete &&
        checklist.documentsComplete &&
        !["VERIFIED", "SUBMITTED", "UNDER_REVIEW", "SUSPENDED"].includes(
          ngo.status
        ),
    },
  });
});

export const submitNGOVerification = asyncHandler(async (req, res) => {
  const ngo = await getNGO(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  if (
    ["VERIFIED", "SUBMITTED", "UNDER_REVIEW", "SUSPENDED"].includes(
      ngo.status
    )
  ) {
    res.status(400);
    throw new Error(
      "Your organization cannot submit verification in its current status."
    );
  }

  const latestDocuments = await getLatestRequiredDocuments(ngo.id);
  const checklist = buildChecklist(ngo, latestDocuments);

  const missingProfileFields = checklist.profile
    .filter((item) => !item.complete)
    .map((item) => item.field);

  const missingDocuments = checklist.documents
    .filter((item) => !item.complete)
    .map((item) => item.type);

  if (missingProfileFields.length || missingDocuments.length) {
    return res.status(400).json({
      success: false,
      message: "Complete the required profile fields and documents first.",
      data: {
        missingProfileFields,
        missingDocuments,
      },
    });
  }

  const updated = await prisma.nGOProfile.update({
    where: { id: ngo.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      reviewedAt: null,
      reviewNote: null,
    },
  });

  res.json({
    success: true,
    message: "Verification application submitted successfully.",
    data: {
      status: updated.status,
      submittedAt: updated.submittedAt,
    },
  });
});
