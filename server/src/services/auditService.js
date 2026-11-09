import { prisma } from "../config/prisma.js";

/** Writes an audit entry. Pass `tx` to make it part of a transaction. */
export const audit = async (
  { actorId = null, action, entity, entityId = null, metadata = null, req = null },
  tx = prisma
) =>
  tx.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      ipAddress: req?.ip ?? null,
      userAgent: req?.get?.("user-agent") ?? null,
      metadata: metadata ?? undefined,
    },
  });
