import prisma from "../config/prisma.js";

const toJSONSafe = (value) => {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toJSONSafe);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        toJSONSafe(val),
      ])
    );
  }

  return value;
};

// Fields that must never be exposed on public pages.
const PRIVATE_NGO_FIELDS = {
  reviewNote: true,
  reviewedAt: true,
  submittedAt: true,
  userId: true,
  registrationNumber: true,
};

// Only published reports are public: NGO-submitted or admin-reviewed (never drafts).
const PUBLIC_REPORT_WHERE = { status: { in: ["SUBMITTED", "REVIEWED"] } };

const publicReportSelect = {
  id: true,
  title: true,
  description: true,
  peopleImpacted: true,
  amountUsedPaise: true,
  reportedAt: true,
  status: true,
  verificationLevel: true,
  beneficiaries: true,
  fundUtilization: true,
  evidence: { select: { id: true, type: true, title: true, description: true, url: true } },
};

const ngoInclude = {
  user: {
    select: {
      name: true,
    },
  },
  causes: {
    include: {
      cause: true,
    },
  },
};

export const getPublicCauses = async () => {
  return prisma.cause.findMany({
    where: {
      isActive: true,
    },
    include: {
      ngos: {
        where: {
          ngo: {
            status: "VERIFIED",
            user: {
              isActive: true,
            },
          },
        },
        select: {
          ngoId: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
};

export const getPublicCauseBySlug = async (slug) => {
  return prisma.cause.findFirst({
    where: {
      slug,
      isActive: true,
    },
    include: {
      ngos: {
        where: {
          ngo: {
            status: "VERIFIED",
            user: {
              isActive: true,
            },
          },
        },
        include: {
          ngo: {
            omit: PRIVATE_NGO_FIELDS,
            include: ngoInclude,
          },
        },
      },
    },
  });
};

export const getPublicNGOs = async ({
  search,
  city,
  cause,
  page = 1,
  limit = 12,
}) => {
  const where = {
    status: "VERIFIED",
    user: {
      isActive: true,
    },
  };

  if (search) {
    where.OR = [
      {
        organizationName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (city) {
    where.city = {
      contains: city,
      mode: "insensitive",
    };
  }

  if (cause) {
    where.causes = {
      some: {
        cause: {
          slug: cause,
          isActive: true,
        },
      },
    };
  }

  const skip = (page - 1) * limit;

  const [ngos, total] = await Promise.all([
    prisma.nGOProfile.findMany({
      where,
      omit: PRIVATE_NGO_FIELDS,
      include: ngoInclude,
      orderBy: {
        organizationName: "asc",
      },
      skip,
      take: limit,
    }),

    prisma.nGOProfile.count({ where }),
  ]);

  return {
    ngos,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPublicNGOById = async (id) => {
  const ngo = await prisma.nGOProfile.findFirst({
    where: {
      id,
      status: "VERIFIED",
      user: {
        isActive: true,
      },
    },
    omit: PRIVATE_NGO_FIELDS,
    include: {
      ...ngoInclude,
      impactReports: {
        where: PUBLIC_REPORT_WHERE,
        select: publicReportSelect,
        orderBy: {
          reportedAt: "desc",
        },
      },
    },
  });

  return ngo ? toJSONSafe(ngo) : null;
};

export const getPublicImpactStats = async () => {
  const [
    verifiedNGOs,
    activeCauses,
    donationCount,
    donationTotal,
    impactReportCount,
  ] = await Promise.all([
    prisma.nGOProfile.count({
      where: {
        status: "VERIFIED",
        user: {
          isActive: true,
        },
      },
    }),

    prisma.cause.count({
      where: {
        isActive: true,
      },
    }),

    prisma.donation.count(),

    prisma.donation.aggregate({
      _sum: {
        amountPaise: true,
      },
      where: {
        status: "COMPLETED",
      },
    }),

    prisma.impactReport.count({ where: PUBLIC_REPORT_WHERE }),
  ]);

  return {
    verifiedNGOs,
    activeCauses,
    donationCount,
    totalDonatedPaise: donationTotal._sum.amountPaise || 0n,
    impactReportCount,
  };
};

export const getPublicImpactReports = async (limit = 12) => {
  const reports = await prisma.impactReport.findMany({
    where: {
      ...PUBLIC_REPORT_WHERE,
      ngo: {
        status: "VERIFIED",
        user: {
          isActive: true,
        },
      },
    },
    select: {
      ...publicReportSelect,
      ngo: {
        select: {
          id: true,
          organizationName: true,
          city: true,
          state: true,
        },
      },
    },
    orderBy: {
      reportedAt: "desc",
    },
    take: limit,
  });

  return toJSONSafe(reports);
};