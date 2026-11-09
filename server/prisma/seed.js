import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { topUp } from "../src/services/walletService.js";
import { authorizePolicy, draftPolicyFromDonor, buildAuthorizationText } from "../src/services/policyService.js";
import { runAllocationWorkflow } from "../src/services/agentGraph.js";

const prisma = new PrismaClient();

const createUser = async ({ name, email, password, role }) => {
  const hashedPassword = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: {
      email: email.toLowerCase(),
    },
    update: {
      name,
      password: hashedPassword,
      role,
      isActive: true,
      emailVerified: true,
    },
    create: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      isActive: true,
      emailVerified: true,
    },
  });
};

const causes = [
  {
    name: "Education",
    slug: "education",
    description: "Education and learning support for underserved communities.",
  },
  {
    name: "Healthcare",
    slug: "healthcare",
    description: "Medical assistance and accessible healthcare.",
  },
  {
    name: "Environment",
    slug: "environment",
    description: "Environmental protection and sustainability initiatives.",
  },
  {
    name: "Hunger Relief",
    slug: "hunger-relief",
    description: "Food security and nutrition assistance.",
  },
  {
    name: "Animal Welfare",
    slug: "animal-welfare",
    description: "Animal care, rescue, and protection.",
  },
];

const ngoSeeds = [
  {
    name: "Demo Seva Foundation",
    email: "ngo@sevakarma.demo",
    organizationName: "Demo Seva Foundation",
    description:
      "A demonstration organization supporting education and community development.",
    city: "Jabalpur",
    state: "Madhya Pradesh",
    causes: ["education", "hunger-relief"],
    reports: [
      {
        title: "Learning Kits for Children",
        description:
          "Provided school learning kits and educational materials to children from underserved communities.",
        peopleImpacted: 80,
        amountUsedPaise: 2500000n,
      },
    ],
  },
  {
    name: "Udaan Education Trust",
    email: "udaan@sevakarma.demo",
    organizationName: "Udaan Education Trust",
    description:
      "Works to improve access to quality education through learning resources and community programs.",
    city: "Nagpur",
    state: "Maharashtra",
    causes: ["education"],
    reports: [
      {
        title: "Community Learning Program",
        description:
          "Organized learning sessions and distributed educational materials to school students.",
        peopleImpacted: 120,
        amountUsedPaise: 4000000n,
      },
    ],
  },
  {
    name: "Swasthya Community Foundation",
    email: "swasthya@sevakarma.demo",
    organizationName: "Swasthya Community Foundation",
    description:
      "Supports community health awareness, medical camps, and access to basic healthcare.",
    city: "Pune",
    state: "Maharashtra",
    causes: ["healthcare"],
    reports: [
      {
        title: "Community Health Camp",
        description:
          "Conducted a community health awareness and basic screening camp.",
        peopleImpacted: 95,
        amountUsedPaise: 3500000n,
      },
    ],
  },
  {
    name: "Green Earth Initiative",
    email: "greenearth@sevakarma.demo",
    organizationName: "Green Earth Initiative",
    description:
      "Promotes environmental conservation, tree plantation, and sustainable communities.",
    city: "Indore",
    state: "Madhya Pradesh",
    causes: ["environment"],
    reports: [
      {
        title: "Community Tree Plantation",
        description:
          "Organized a local plantation drive and engaged community volunteers.",
        peopleImpacted: 60,
        amountUsedPaise: 1800000n,
      },
    ],
  },
  {
    name: "Annapurna Food Bank",
    email: "annapurna@sevakarma.demo",
    organizationName: "Annapurna Food Bank",
    description: "Runs community kitchens and ration drives for families facing food insecurity.",
    mission: "No family in our city should sleep hungry.",
    city: "Bhopal",
    state: "Madhya Pradesh",
    causes: ["hunger-relief"],
    minimumDonationPaise: 20000n,
    reports: [
      {
        title: "Monthly Ration Distribution",
        description: "Distributed dry ration kits to families identified through local volunteers.",
        peopleImpacted: 210,
        amountUsedPaise: 5200000n,
        status: "REVIEWED",
        verificationLevel: "ADMIN_REVIEWED",
      },
    ],
  },
  {
    name: "Paws & Care Society",
    email: "paws@sevakarma.demo",
    organizationName: "Paws & Care Society",
    description: "Rescues, treats and rehomes injured and abandoned street animals.",
    mission: "A safe and healthy life for every animal.",
    city: "Mumbai",
    state: "Maharashtra",
    causes: ["animal-welfare", "healthcare"],
    minimumDonationPaise: 10000n,
    reports: [],
  },
];

// An NGO that has applied for verification (for the admin demo).
const pendingNgo = {
  name: "Jyoti Seva Trust",
  email: "ngo.pending@sevakarma.demo",
  organizationName: "Jyoti Seva Trust",
  description: "Newly registered organization supporting rural education.",
  city: "Raipur",
  state: "Chhattisgarh",
};

const NGO_IMAGES = {
  "Demo Seva Foundation": "/images/ngos/demo-seva.jpg",
  "Udaan Education Trust": "/images/ngos/udaan.jpg",
  "Swasthya Community Foundation": "/images/ngos/swasthya.jpg",
  "Green Earth Initiative": "/images/ngos/green-earth.jpg",
  "Annapurna Food Bank": "/images/ngos/annapurna.jpg",
  "Paws & Care Society": "/images/ngos/paws.jpg",
};

const main = async () => {
  // Demo admin account
  const admin = await createUser({
    name: process.env.ADMIN_NAME || "SevaKarma Admin",
    email: process.env.ADMIN_EMAIL || "admin@sevakarma.demo",
    password: process.env.ADMIN_PASSWORD || "Admin@12345",
    role: "ADMIN",
  });

  // Demo donor account
  const donor = await createUser({
    name: "Demo Donor",
    email: process.env.DONOR_DEMO_EMAIL || "donor@sevakarma.demo",
    password: process.env.DONOR_DEMO_PASSWORD || "Donor@12345",
    role: "DONOR",
  });

  const donorProfile = await prisma.donorProfile.upsert({
    where: {
      userId: donor.id,
    },
    update: {},
    create: {
      userId: donor.id,
      city: "Jabalpur",
      state: "Madhya Pradesh",
      country: "India",
    },
  });

  await prisma.walletAccount.upsert({
    where: {
      donorId: donorProfile.id,
    },
    update: {},
    create: {
      donorId: donorProfile.id,
      balancePaise: 0,
    },
  });

  // Create causes
  for (const cause of causes) {
    await prisma.cause.upsert({
      where: {
        slug: cause.slug,
      },
      update: {
        name: cause.name,
        description: cause.description,
        isActive: true,
      },
      create: cause,
    });
  }

  // Create NGOs, their cause associations, and sample impact reports
  for (const ngoData of ngoSeeds) {
    const user = await createUser({
      name: ngoData.name,
      email: ngoData.email,
      password: "NGO@12345",
      role: "NGO",
    });

    const ngo = await prisma.nGOProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        organizationName: ngoData.organizationName,
        logoUrl: NGO_IMAGES[ngoData.organizationName] ?? null,
        description: ngoData.description,
        mission: ngoData.mission ?? ngoData.description,
        minimumDonationPaise: ngoData.minimumDonationPaise ?? null,
        city: ngoData.city,
        state: ngoData.state,
        country: "India",
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
      create: {
        userId: user.id,
        organizationName: ngoData.organizationName,
        logoUrl: NGO_IMAGES[ngoData.organizationName] ?? null,
        description: ngoData.description,
        mission: ngoData.mission ?? ngoData.description,
        minimumDonationPaise: ngoData.minimumDonationPaise ?? null,
        city: ngoData.city,
        state: ngoData.state,
        country: "India",
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
    });

    for (const slug of ngoData.causes) {
      const cause = await prisma.cause.findUnique({
        where: {
          slug,
        },
      });

      if (!cause) continue;

      await prisma.nGOCause.upsert({
        where: {
          ngoId_causeId: {
            ngoId: ngo.id,
            causeId: cause.id,
          },
        },
        update: {},
        create: {
          ngoId: ngo.id,
          causeId: cause.id,
        },
      });
    }

    for (const report of ngoData.reports) {
      const existingReport = await prisma.impactReport.findFirst({
        where: {
          ngoId: ngo.id,
          title: report.title,
        },
      });

      if (!existingReport) {
        await prisma.impactReport.create({
          data: {
            ngoId: ngo.id,
            title: report.title,
            description: report.description,
            peopleImpacted: report.peopleImpacted,
            amountUsedPaise: report.amountUsedPaise,
            reportedAt: new Date(),
            status: report.status ?? "SUBMITTED",
            verificationLevel: report.verificationLevel ?? "NGO_REPORTED",
            submittedAt: new Date(),
            beneficiaries: [{ group: "Community members", count: report.peopleImpacted, note: "Demo data" }],
            fundUtilization: [{ category: "Programme delivery", amountPaise: report.amountUsedPaise.toString(), note: "Demo data" }],
          },
        });
      }
    }
  }

  // NGO awaiting verification (admin demo)
  const pendingUser = await createUser({ name: pendingNgo.name, email: pendingNgo.email, password: "NGO@12345", role: "NGO" });
  await prisma.nGOProfile.upsert({
    where: { userId: pendingUser.id },
    update: {},
    create: { userId: pendingUser.id, organizationName: pendingNgo.organizationName, description: pendingNgo.description, city: pendingNgo.city, state: pendingNgo.state, status: "SUBMITTED", submittedAt: new Date() },
  });

  // Workflow definition for the agent monitor
  await prisma.agentWorkflow.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: { id: "00000000-0000-4000-8000-000000000001", name: "sevakarma-allocation", description: "Gemini-assisted, deterministic donation allocation workflow (LangGraph)", version: "1.0" },
  });

  // ---- Demo donors ----
  const causeBySlug = Object.fromEntries((await prisma.cause.findMany()).map((c) => [c.slug, c.id]));
  const ngoByName = Object.fromEntries((await prisma.nGOProfile.findMany()).map((n) => [n.organizationName, n.id]));

  // Donor 1: has preferences but has NOT authorized yet, so judges can walk through authorization.
  const donor1 = await prisma.donorProfile.update({
    where: { id: donorProfile.id },
    data: {
      preferredCauseIds: [causeBySlug.education, causeBySlug.healthcare],
      excludedCauseIds: [causeBySlug["animal-welfare"]],
      monthlyBudgetPaise: 500000n,
      maxDonationPerNgoPaise: 300000n,
      maxNgosPerAllocation: 3,
      minDonationPaise: 10000n,
    },
  });
  await prisma.walletAccount.update({ where: { donorId: donor1.id }, data: {} });
  await topUp({ walletId: (await prisma.walletAccount.findUnique({ where: { donorId: donor1.id } })).id, amountPaise: 1000000n, idempotencyKey: "seed-topup-donor1" });

  // Donor 2: already authorized; makes demo donations through the real agent workflow.
  const user2 = await createUser({ name: "Priya Sharma", email: "donor2@sevakarma.demo", password: "Donor@12345", role: "DONOR" });
  let donor2 = await prisma.donorProfile.upsert({ where: { userId: user2.id }, update: {}, create: { userId: user2.id, city: "Pune", state: "Maharashtra", country: "India" } });
  await prisma.walletAccount.upsert({ where: { donorId: donor2.id }, update: {}, create: { donorId: donor2.id } });
  donor2 = await prisma.donorProfile.update({
    where: { id: donor2.id },
    data: {
      preferredCauseIds: [causeBySlug.environment, causeBySlug["hunger-relief"], causeBySlug["animal-welfare"]],
      excludedCauseIds: [],
      monthlyBudgetPaise: 1500000n,
      maxDonationPerNgoPaise: 500000n,
      maxNgosPerAllocation: 3,
      minDonationPaise: 10000n,
      anonymous: true,
    },
  });
  const wallet2 = await prisma.walletAccount.findUnique({ where: { donorId: donor2.id } });
  await topUp({ walletId: wallet2.id, amountPaise: 2500000n, idempotencyKey: "seed-topup-donor2" });
  const auth = await buildAuthorizationText(draftPolicyFromDonor(donor2));
  const policy2 = await authorizePolicy(donor2, { confirmVersion: auth.version, confirmText: auth.text });

  for (const [i, [amount, intent]] of [[300000n, "Food and nature"], [200000n, "Help animals and hungry families"]].entries()) {
    const fresh = await prisma.donorProfile.findUnique({ where: { id: donor2.id }, include: { walletAccount: true } });
    const run = await runAllocationWorkflow({ donor: fresh, wallet: fresh.walletAccount, policy: policy2, requestedPaise: amount, intentText: intent, idempotencyKey: `seed-demo-donation-${i + 1}`, trigger: "MANUAL", userId: user2.id });
    console.log(`Seed donation ${i + 1}:`, run.execution?.status, run.duplicate ? "(already existed)" : "");
  }

  console.log("Demo data seeded successfully.");
  console.log("Admin:", admin.email);
  console.log("Donor:", donor.email, "(preferences set, not yet authorized)");
  console.log("Donor 2: donor2@sevakarma.demo (authorized, has donations)");
  console.log("NGO accounts:");

  for (const ngo of ngoSeeds) {
    console.log(`${ngo.organizationName}: ${ngo.email}`);
  }

  console.log("Demo NGO password: NGO@12345");
};

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });