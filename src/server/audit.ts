import { Prisma } from "@prisma/client";

// Actor type mirrors the AuditLog actorType comment: "user" | "system" | "ai".
export type ActorType = "user" | "system" | "ai";

export interface AuditInput {
  orgId: string;
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  data?: Prisma.InputJsonValue;
}

/**
 * Append an audit entry inside the caller's transaction so the state change and
 * its audit row commit atomically. The caller MUST pass a transaction client
 * (e.g. `prisma.$transaction(async (tx) => { await audit(tx, {...}); ... })`).
 *
 * AuditLog is append-only: this is the only write path for that table.
 */
export async function audit(
  tx: Prisma.TransactionClient,
  input: AuditInput,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      orgId: input.orgId,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      data: input.data ?? Prisma.JsonNull,
    },
  });
}
