import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const getNGOForUser = (userId) =>
  prisma.nGOProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

const toRupees = (paise) =>
  paise == null ? 0 : Number(paise) / 100;

const serializeAllocation = (allocation) => {
  const donation = allocation.donation;
  const isAnonymous =
    donation.isAnonymous || donation.donor.anonymous;

  return {
    id: allocation.id,
    donationId: donation.id,
    donationDate: donation.createdAt,
    donationStatus: donation.status,
    donationAmount: toRupees(donation.amountPaise),
    allocatedAmount: toRupees(allocation.amountPaise),
    allocationStatus: allocation.status,
    matchScore: allocation.matchScore,
    reason: allocation.reason,
    donorName: isAnonymous
      ? "Anonymous"
      : donation.donor.user.name,
    isAnonymous,
    createdAt: allocation.createdAt,
  };
};

export const getNGODonations = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const allocations = await prisma.donationAllocation.findMany({
    where: { ngoId: ngo.id },
    include: {
      donation: {
        select: {
          id: true,
          amountPaise: true,
          status: true,
          isAnonymous: true,
          createdAt: true,
          donor: {
            select: {
              anonymous: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = allocations.map(serializeAllocation);

  const totalAllocatedPaise = allocations
    .filter(
      (item) =>
        item.status === "APPROVED" ||
        item.status === "COMPLETED"
    )
    .reduce((sum, item) => sum + item.amountPaise, 0n);

  const completedPaise = allocations
    .filter((item) => item.status === "COMPLETED")
    .reduce((sum, item) => sum + item.amountPaise, 0n);

  const proposedPaise = allocations
    .filter((item) => item.status === "PROPOSED")
    .reduce((sum, item) => sum + item.amountPaise, 0n);

  const uniqueDonationIds = new Set(
    allocations.map((item) => item.donationId)
  );

  res.json({
    success: true,
    data,
    stats: {
      totalDonations: uniqueDonationIds.size,
      totalAllocations: allocations.length,
      totalAllocated: toRupees(totalAllocatedPaise),
      completedAmount: toRupees(completedPaise),
      proposedAmount: toRupees(proposedPaise),
    },
  });
});

export const getNGOPayouts = asyncHandler(async (req, res) => {
  const ngo = await getNGOForUser(req.user.id);

  if (!ngo) {
    res.status(404);
    throw new Error("NGO profile not found.");
  }

  const payouts = await prisma.nGOPayout.findMany({
    where: { ngoId: ngo.id },
    orderBy: { createdAt: "desc" },
  });

  const data = payouts.map((payout) => ({
    id: payout.id,
    amount: toRupees(payout.amountPaise),
    currency: payout.currency,
    status: payout.status,
    reference: payout.reference,
    processedAt: payout.processedAt,
    createdAt: payout.createdAt,
  }));

  const totalCompletedPaise = payouts
    .filter((payout) => payout.status === "COMPLETED")
    .reduce((sum, payout) => sum + payout.amountPaise, 0n);

  const totalPendingPaise = payouts
    .filter(
      (payout) =>
        payout.status === "REQUESTED" ||
        payout.status === "PROCESSING"
    )
    .reduce((sum, payout) => sum + payout.amountPaise, 0n);

  res.json({
    success: true,
    data,
    stats: {
      totalPayouts: payouts.length,
      completedAmount: toRupees(totalCompletedPaise),
      pendingAmount: toRupees(totalPendingPaise),
    },
  });
});