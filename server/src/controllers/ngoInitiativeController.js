
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const getNGOForUser = (userId) =>
  prisma.nGOProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

const serializeInitiative = (initiative) => ({
  ...initiative,
  targetAmount:
    initiative.targetAmountPaise === null
      ? null
      : Number(initiative.targetAmountPaise) / 100,
  targetAmountPaise: undefined,
});

const parseDate = (date) =>
  date ? new Date(`${date}T00:00:00.000Z`) : null;

const verifySelectedCause = async (ngoId, causeId) => {
  const selectedCause = await prisma.nGOCause.findUnique({
    where: {
      ngoId_causeId: { ngoId, causeId },
    },
  });

  return Boolean(selectedCause);
};

export const getNGOInitiatives = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const initiatives = await prisma.initiative.findMany({
    where: { ngoId: ngo.id },
    include: {
      cause: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    data: initiatives.map(serializeInitiative),
  });
});

export const createNGOInitiative = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const {
    title,
    description,
    causeId,
    targetAmount,
    startDate,
    endDate,
    status,
  } = req.body;

  if (!(await verifySelectedCause(ngo.id, causeId))) {
    res.status(400);
    throw new Error("Please select a cause assigned to your NGO.");
  }

  const initiative = await prisma.initiative.create({
    data: {
      ngoId: ngo.id,
      causeId,
      title,
      description,
      targetAmountPaise:
        targetAmount == null
          ? null
          : BigInt(Math.round(targetAmount * 100)),
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
      ...(status ? { status } : {}),
    },
    include: {
      cause: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: "Initiative created successfully.",
    data: serializeInitiative(initiative),
  });
});

export const updateNGOInitiative = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const { initiativeId } = req.params;

  const existing = await prisma.initiative.findFirst({
    where: { id: initiativeId, ngoId: ngo.id },
  });

  if (!existing) {
    res.status(404);
    throw new Error("Initiative not found.");
  }

  const {
    title,
    description,
    causeId,
    targetAmount,
    startDate,
    endDate,
    status,
  } = req.body;

  if (
    causeId &&
    !(await verifySelectedCause(ngo.id, causeId))
  ) {
    res.status(400);
    throw new Error("Please select a cause assigned to your NGO.");
  }

  const initiative = await prisma.initiative.update({
    where: { id: existing.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(causeId !== undefined && { causeId }),
      ...(targetAmount !== undefined && {
        targetAmountPaise:
          targetAmount === null
            ? null
            : BigInt(Math.round(targetAmount * 100)),
      }),
      ...(startDate !== undefined && {
        startDate: parseDate(startDate),
      }),
      ...(endDate !== undefined && {
        endDate: parseDate(endDate),
      }),
      ...(status !== undefined && { status }),
    },
    include: {
      cause: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  res.json({
    success: true,
    message: "Initiative updated successfully.",
    data: serializeInitiative(initiative),
  });
});

export const deleteNGOInitiative = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const existing = await prisma.initiative.findFirst({
    where: {
      id: req.params.initiativeId,
      ngoId: ngo.id,
    },
  });

  if (!existing) {
    res.status(404);
    throw new Error("Initiative not found.");
  }

  await prisma.initiative.delete({
    where: { id: existing.id },
  });

  res.json({
    success: true,
    message: "Initiative deleted successfully.",
  });
});
