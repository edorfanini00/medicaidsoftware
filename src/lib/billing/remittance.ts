import type { ClaimStatus, Prisma } from "@prisma/client";
import { auditTx } from "../audit";
import { prisma } from "../db";
import type { RemittanceFile } from "../clearinghouse/types";

// Applies a parsed 835 to claims and lines. Idempotent on the payer's
// check/EFT number: re-ingesting the same remittance is a no-op, which makes
// webhook retries and batch re-pulls safe.
export async function applyRemittance(file: RemittanceFile) {
  const payer = await prisma.payer.findFirst({
    where: { externalPayerId: file.payerExternalId },
  });
  if (!payer) {
    return { ok: false as const, error: `Unknown payer ${file.payerExternalId}` };
  }

  const existing = await prisma.remittanceAdvice.findUnique({
    where: {
      payerId_checkOrEftNumber: { payerId: payer.id, checkOrEftNumber: file.checkOrEftNumber },
    },
  });
  if (existing) {
    return { ok: true as const, remittanceId: existing.id, duplicate: true };
  }

  const remittanceId = await prisma.$transaction(async (tx) => {
    let totalPaidCents = 0;

    const remit = await tx.remittanceAdvice.create({
      data: {
        payerId: payer.id,
        remitDate: new Date(file.remitDate),
        checkOrEftNumber: file.checkOrEftNumber,
        totalPaidCents: 0,
        raw: file as unknown as Prisma.InputJsonValue,
      },
    });

    for (const remitClaim of file.claims) {
      const claim = await tx.claim.findUnique({
        where: { claimNumber: remitClaim.claimNumber },
        include: { lines: true },
      });
      if (!claim) continue; // unknown claim numbers are kept in raw for review

      let claimPaid = 0;
      let anyDenied = false;
      let anyPaid = false;

      for (const remitLine of remitClaim.lines) {
        const line = claim.lines.find((l) => l.lineNumber === remitLine.lineNumber);
        if (!line) continue;

        const denied = remitLine.paidCents === 0 && remitLine.reasonCodes.length > 0;
        anyDenied ||= denied;
        anyPaid ||= remitLine.paidCents > 0;
        claimPaid += remitLine.paidCents;

        await tx.remittanceLine.create({
          data: {
            remittanceId: remit.id,
            claimId: claim.id,
            claimLineId: line.id,
            paidCents: remitLine.paidCents,
            allowedCents: remitLine.allowedCents,
            adjustmentCents: remitLine.adjustmentCents,
            adjustmentGroupCode: remitLine.adjustmentGroupCode,
            reasonCodes: remitLine.reasonCodes,
            remarkCodes: remitLine.remarkCodes,
          },
        });

        await tx.claimLine.update({
          where: { id: line.id },
          data: {
            paidCents: remitLine.paidCents,
            allowedCents: remitLine.allowedCents,
            adjustmentCents: remitLine.adjustmentCents,
            denialCodes: denied ? remitLine.reasonCodes : [],
            remarkCodes: remitLine.remarkCodes,
            status: denied ? "DENIED" : remitLine.adjustmentCents > 0 ? "ADJUSTED" : "PAID",
          },
        });

        await tx.service.update({
          where: { id: line.serviceId },
          data: { status: denied ? "DENIED" : "PAID" },
        });
      }

      const newStatus: ClaimStatus =
        anyPaid && anyDenied ? "PARTIALLY_PAID" : anyPaid ? "PAID" : "DENIED";

      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: newStatus,
          totalPaidCents: claim.totalPaidCents + claimPaid,
          payerClaimControlNumber: remitClaim.payerClaimControlNumber,
        },
      });
      await tx.claimEvent.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: newStatus,
          source: "PAYER",
          message: `835 ${file.checkOrEftNumber}: paid ${claimPaid} cents`,
        },
      });

      totalPaidCents += claimPaid;
    }

    await tx.remittanceAdvice.update({
      where: { id: remit.id },
      data: { totalPaidCents },
    });
    await auditTx(tx, {
      actorType: "WEBHOOK",
      action: "REMITTANCE_INGEST",
      entityType: "RemittanceAdvice",
      entityId: remit.id,
      detail: { checkOrEftNumber: file.checkOrEftNumber, totalPaidCents },
    });
    return remit.id;
  });

  return { ok: true as const, remittanceId, duplicate: false };
}
