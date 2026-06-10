import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Marks a remittance as matched to a bank deposit. The check/EFT number is
// the matching key against the bank statement.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser("ADMIN");
    if (!user) return jsonError("Admin access required", 403);
    const { id } = await params;
    await prisma.remittanceAdvice.update({
      where: { id },
      data: { reconciledAt: new Date() },
    });
    await audit({
      actorType: "USER",
      actorId: user.id,
      action: "REMIT_RECONCILE",
      entityType: "RemittanceAdvice",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
