import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

type AuditInput = {
  actorType: "USER" | "DOULA" | "SYSTEM" | "WEBHOOK";
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  detail?: Prisma.InputJsonValue;
};

// Append-only audit trail. Use the `tx` variant inside transactions so the
// audit row commits atomically with the change it describes.
export async function audit(input: AuditInput) {
  await prisma.auditLog.create({ data: input });
}

export async function auditTx(tx: Prisma.TransactionClient, input: AuditInput) {
  await tx.auditLog.create({ data: input });
}
