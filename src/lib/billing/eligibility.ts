import type { Prisma } from "@prisma/client";
import { audit } from "../audit";
import { getClearinghouse } from "../clearinghouse";
import { prisma } from "../db";
import { getActiveRuleset } from "../rulesets";

// Runs a 270/271 for a client and stores the result. The stored check is the
// evidence trail for "we verified coverage before service".
export async function checkEligibility(clientId: string, serviceDate: Date, actorId?: string) {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: { payer: true },
  });

  let payerExternalId = client.payer?.externalPayerId;
  if (!payerExternalId) {
    const ruleset = await getActiveRuleset(client.state);
    if (ruleset?.defaultPayerId) {
      const payer = await prisma.payer.findUnique({ where: { id: ruleset.defaultPayerId } });
      payerExternalId = payer?.externalPayerId;
    }
  }
  if (!payerExternalId) {
    return { ok: false as const, error: `No payer resolvable for ${client.state}` };
  }

  const result = await getClearinghouse().checkEligibility({
    memberId: client.medicaidId,
    firstName: client.firstName,
    lastName: client.lastName,
    dob: client.dob.toISOString().slice(0, 10),
    serviceDate: serviceDate.toISOString().slice(0, 10),
    payerId: payerExternalId,
  });

  const check = await prisma.eligibilityCheck.create({
    data: {
      clientId,
      serviceDate,
      status: result.status,
      payerName: result.payerName,
      coverageDetails: (result.coverageDetails ?? undefined) as Prisma.InputJsonValue | undefined,
      rawResponse: (result.raw ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  await audit({
    actorType: actorId ? "USER" : "SYSTEM",
    actorId,
    action: "ELIGIBILITY_CHECK",
    entityType: "Client",
    entityId: clientId,
    detail: { status: result.status, eligibilityCheckId: check.id },
  });

  return { ok: true as const, check };
}
