
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import asyncHandler from "../utils/asyncHandler.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
});


const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,

  donorProfile: user.donorProfile
    ? {
      ...user.donorProfile,
      walletAccount: user.donorProfile.walletAccount
        ? {
          ...user.donorProfile.walletAccount,
          balancePaise: user.donorProfile.walletAccount.balancePaise?.toString(),
        }
        : undefined,
    }
    : undefined,

  ngoProfile: user.ngoProfile
    ? {
      ...user.ngoProfile,
      minimumDonationPaise:
        user.ngoProfile.minimumDonationPaise?.toString() ?? null,
    }
    : undefined,
});


export const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    city,
    state,
    organizationName,
    description,
    referralCode,
  } = req.body;

  const normalizedEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists",
    });
  }

  // Public registration never creates ADMIN accounts.
  if (!["DONOR", "NGO"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration role",
    });
  }

  if (role === "NGO" && !organizationName) {
    return res.status(400).json({
      success: false,
      message: "Organization name is required for NGO registration",
    });
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
      },
    });

    if (role === "DONOR") {
      await tx.donorProfile.create({
        data: {
          userId: createdUser.id,
          phone,
          city,
          state,
          // Only accept a referral code that belongs to a real donor.
          referredByCode: referralCode
            ? (await tx.donorProfile.findUnique({ where: { referralCode: referralCode.toUpperCase() }, select: { referralCode: true } }))?.referralCode ?? null
            : null,
        },
      });

      await tx.walletAccount.create({
        data: {
          donorId: (
            await tx.donorProfile.findUnique({
              where: { userId: createdUser.id },
              select: { id: true },
            })
          ).id,
        },
      });
    }

    if (role === "NGO") {
      await tx.nGOProfile.create({
        data: {
          userId: createdUser.id,
          organizationName,
          description,
          phone,
          city,
          state,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: createdUser.id,
        action: "USER_REGISTERED",
        entity: "User",
        entityId: createdUser.id,
        metadata: { role },
      },
    });

    return tx.user.findUnique({
      where: { id: createdUser.id },
      include: {
        donorProfile: true,
        ngoProfile: true,
      },
    });
  });

  const token = generateToken(user);

  res.cookie(
    process.env.JWT_COOKIE_NAME || "sevakarma_token",
    token,
    cookieOptions()
  );

  return res.status(201).json({
    success: true,
    message: "Registration successful",
    user: safeUser(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      donorProfile: true,
      ngoProfile: true,
    },
  });

  // Keep the response generic to avoid revealing registered emails.
  if (!user || !(await comparePassword(password, user.password))) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: "Your account is inactive. Contact support.",
    });
  }

  const token = generateToken(user);

  res.cookie(
    process.env.JWT_COOKIE_NAME || "sevakarma_token",
    token,
    cookieOptions()
  );

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "USER_LOGIN",
      entity: "User",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    },
  });

  return res.json({
    success: true,
    message: "Login successful",
    user: safeUser(user),
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      donorProfile: true,
      ngoProfile: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.json({
    success: true,
    user: safeUser(user),
  });
});

export const logout = asyncHandler(async (req, res) => {
  const cookieName = process.env.JWT_COOKIE_NAME || "sevakarma_token";

  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// POST /api/auth/password — change own password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!(await comparePassword(currentPassword, user.password))) {
    return res.status(400).json({ success: false, message: "Current password is incorrect" });
  }
  await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(newPassword) } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "PASSWORD_CHANGED", entity: "User", entityId: user.id, ipAddress: req.ip } });
  res.json({ success: true, message: "Password updated" });
});
