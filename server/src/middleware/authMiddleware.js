
import { prisma } from "../config/prisma.js";
import { verifyToken } from "../utils/jwt.js";

export const protect = async (req, res, next) => {
  try {
    const cookieName = process.env.JWT_COOKIE_NAME || "sevakarma_token";

    const cookieToken = req.cookies?.[cookieName];

    const authHeader = req.headers.authorization;

    const bearerToken =
      authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    const token = cookieToken || bearerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive account",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};
