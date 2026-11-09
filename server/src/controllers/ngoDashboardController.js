import { prisma } from "../config/prisma.js";

const toRupees = (paise) => Number(paise || 0n) / 100;

export const getNGODashboard = async (req, res, next) => {
  try {
    // Always derive the NGO from the authenticated user.
    const ngo = await prisma.nGOProfile.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        organizationName: true,
        status: true,
        city: true,
        state: true,
        country: true,
      },
    });

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO profile not found.",
      });
    }

    const ngoId = ngo.id;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      allocationCount,
      completedTotal,
      donorRows,
      pendingPayouts,
      completedPayouts,
      monthlyRows,
      recentAllocations,
    ] = await Promise.all([
      prisma.donationAllocation.count({
        where: { ngoId },
      }),

      prisma.donationAllocation.aggregate({
        where: {
          ngoId,
          status: "COMPLETED",
        },
        _sum: { amountPaise: true },
      }),

      prisma.donationAllocation.findMany({
        where: { ngoId },
        select: {
          donation: {
            select: { donorId: true },
          },
        },
      }),

      prisma.nGOPayout.aggregate({
        where: {
          ngoId,
          status: { in: ["REQUESTED", "PROCESSING"] },
        },
        _sum: { amountPaise: true },
        _count: { _all: true },
      }),

      prisma.nGOPayout.aggregate({
        where: {
          ngoId,
          status: "COMPLETED",
        },
        _sum: { amountPaise: true },
        _count: { _all: true },
      }),

      prisma.donationAllocation.findMany({
        where: {
          ngoId,
          status: "COMPLETED",
          createdAt: { gte: sixMonthsAgo },
        },
        select: {
          amountPaise: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.donationAllocation.findMany({
        where: { ngoId },
        include: {
          donation: {
            include: {
              donor: {
                include: {
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    // Count distinct donor accounts without returning donor IDs.
    const donorCount = new Set(
      donorRows
        .map((row) => row.donation?.donorId)
        .filter(Boolean)
    ).size;

    // Build a continuous six-month trend, including months with zero donations.
    const monthlyMap = new Map();

    for (let i = 0; i < 6; i += 1) {
      const date = new Date(sixMonthsAgo);
      date.setMonth(sixMonthsAgo.getMonth() + i);

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      monthlyMap.set(key, {
        month: date.toLocaleString("en-IN", { month: "short" }),
        amount: 0,
      });
    }

    for (const row of monthlyRows) {
      const date = new Date(row.createdAt);
      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (monthlyMap.has(key)) {
        monthlyMap.get(key).amount += toRupees(row.amountPaise);
      }
    }

    const recentDonations = recentAllocations.map((allocation) => {
      const donation = allocation.donation;
      const donor = donation?.donor;

      // Never expose identity for anonymous donations.
      const isAnonymous =
        donation?.isAnonymous === true || donor?.anonymous === true;

      return {
        id: allocation.id,
        donationId: donation?.id,
        donorName: isAnonymous
          ? "Anonymous"
          : donor?.user?.name || "Supporter",
        amount: toRupees(allocation.amountPaise),
        currency: donation?.currency || "INR",
        status: allocation.status,
        date: donation?.createdAt || allocation.createdAt,
        anonymous: isAnonymous,
      };
    });

    return res.json({
      success: true,
      data: {
        ngo,
        overview: {
          totalDonations: allocationCount,
          totalReceived: toRupees(completedTotal._sum.amountPaise),
          donorCount,
          pendingPayoutAmount: toRupees(
            pendingPayouts._sum.amountPaise
          ),
          pendingPayoutCount: pendingPayouts._count._all,
          completedPayoutAmount: toRupees(
            completedPayouts._sum.amountPaise
          ),
          completedPayoutCount: completedPayouts._count._all,
        },
        monthlyTrend: Array.from(monthlyMap.values()),
        recentDonations,
      },
    });
  } catch (error) {
    next(error);
  }
};