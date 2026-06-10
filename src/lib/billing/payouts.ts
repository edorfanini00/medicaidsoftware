import { auditTx } from "../audit";
import { prisma } from "../db";

// Creates pending payouts for every paid claim line that has not been paid
// out yet, grouped by rendering doula. The fee is the doula's feeBps applied
// to the paid amount, rounded down so rounding always favors the doula's
// ledger consistency (gross = fee + net exactly).
export async function generatePayouts(actorId?: string) {
  const unpaidLines = await prisma.claimLine.findMany({
    where: {
      status: { in: ["PAID", "ADJUSTED"] },
      paidCents: { gt: 0 },
      payoutLines: { none: {} },
    },
    include: { claim: { include: { renderingDoula: true } } },
  });

  const byDoula = new Map<string, typeof unpaidLines>();
  for (const line of unpaidLines) {
    const id = line.claim.renderingDoulaId;
    byDoula.set(id, [...(byDoula.get(id) ?? []), line]);
  }

  const payoutIds: string[] = [];
  for (const [doulaId, lines] of byDoula) {
    const feeBps = lines[0].claim.renderingDoula.feeBps;
    const payoutId = await prisma.$transaction(async (tx) => {
      let gross = 0;
      let fee = 0;

      const payout = await tx.payout.create({
        data: { doulaId, grossCents: 0, feeCents: 0, netCents: 0 },
      });

      for (const line of lines) {
        const lineFee = Math.floor((line.paidCents * feeBps) / 10000);
        gross += line.paidCents;
        fee += lineFee;
        await tx.payoutLine.create({
          data: {
            payoutId: payout.id,
            claimLineId: line.id,
            grossCents: line.paidCents,
            feeCents: lineFee,
            netCents: line.paidCents - lineFee,
          },
        });
      }

      await tx.payout.update({
        where: { id: payout.id },
        data: { grossCents: gross, feeCents: fee, netCents: gross - fee },
      });
      await auditTx(tx, {
        actorType: actorId ? "USER" : "SYSTEM",
        actorId,
        action: "PAYOUT_GENERATE",
        entityType: "Payout",
        entityId: payout.id,
        detail: { doulaId, grossCents: gross, feeCents: fee, lineCount: lines.length },
      });
      return payout.id;
    });
    payoutIds.push(payoutId);
  }

  return { created: payoutIds.length, payoutIds };
}

// Marks a payout paid after the rail confirms execution. The ledger keeps the
// rail reference but never depends on the rail for truth.
export async function markPayoutPaid(payoutId: string, railRef: string, actorId?: string) {
  await prisma.$transaction(async (tx) => {
    await tx.payout.update({
      where: { id: payoutId },
      data: { status: "PAID", railRef, paidAt: new Date() },
    });
    await auditTx(tx, {
      actorType: actorId ? "USER" : "SYSTEM",
      actorId,
      action: "PAYOUT_PAID",
      entityType: "Payout",
      entityId: payoutId,
      detail: { railRef },
    });
  });
}
