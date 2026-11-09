import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const getNGOForUser = (userId) =>
  prisma.nGOProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

export const getNGOCauses = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const [causes, selected] = await Promise.all([
    prisma.cause.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    }),

    prisma.nGOCause.findMany({
      where: { ngoId: ngo.id },
      select: { causeId: true },
    }),
  ]);

  const selectedCauseIds = selected.map((item) => item.causeId);
  const selectedSet = new Set(selectedCauseIds);

  res.json({
    success: true,
    data: {
      causes: causes.map((cause) => ({
        ...cause,
        selected: selectedSet.has(cause.id),
      })),
      selectedCauseIds: causes
        .filter((cause) => selectedSet.has(cause.id))
        .map((cause) => cause.id),
    },
  });
});

export const updateNGOCauses = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const { causeIds } = req.body;

  const activeCauses = await prisma.cause.findMany({
    where: {
      id: { in: causeIds },
      isActive: true,
    },
    select: { id: true },
  });

  if (activeCauses.length !== causeIds.length) {
    res.status(400);
    throw new Error("One or more selected causes are invalid or inactive.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.nGOCause.deleteMany({
      where: { ngoId: ngo.id },
    });

    if (causeIds.length > 0) {
      await tx.nGOCause.createMany({
        data: causeIds.map((causeId) => ({
          ngoId: ngo.id,
          causeId,
        })),
      });
    }
  });

  const selectedCauses = await prisma.nGOCause.findMany({
    where: { ngoId: ngo.id },
    include: {
      cause: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
        },
      },
    },
    orderBy: {
      cause: { name: "asc" },
    },
  });

  res.json({
    success: true,
    message: "NGO causes updated successfully.",
    data: selectedCauses.map((item) => item.cause),
  });
});