import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api";
import { auditTx } from "@/lib/audit";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Moves a denied or rejected claim into REWORKING so it can be corrected and
// resubmitted. Adjudicated history stays on the claim; the resubmission gets
// its own events.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser("ADMIN");
    if (!user) return jsonError("Admin access required", 403);
    const { id } = await params;
    const claim = await prisma.claim.findUniqueOrThrow({ where: { id } });
    if (!["DENIED", "REJECTED", "PARTIALLY_PAID"].includes(claim.status)) {
      return jsonError(`Claim is ${claim.status}; only denied, rejected, or partially paid claims can be reworked.`, 409);
    }
    await prisma.$transaction(async (tx) => {
      await tx.claim.update({ where: { id }, data: { status: "REWORKING" } });
      await tx.claimEvent.create({
        data: {
          claimId: id,
          fromStatus: claim.status,
          toStatus: "REWORKING",
          source: "USER",
          message: "Moved to rework queue",
        },
      });
      await auditTx(tx, {
        actorType: "USER",
        actorId: user.id,
        action: "CLAIM_REWORK",
        entityType: "Claim",
        entityId: id,
      });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
