import { randomBytes } from "crypto";
import { auditTx } from "../audit";
import { getClearinghouse } from "../clearinghouse";
import type { ClaimSubmission } from "../clearinghouse/types";
import { prisma } from "../db";
import { getActiveRuleset } from "../rulesets";
import { validateServices, type ValidationIssue } from "./validation";

function newClaimNumber(): string {
  // Internal patient control number (CLM01). Short, unique, payer-safe.
  return `DLA${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type BuildClaimResult =
  | { ok: true; claimId: string }
  | { ok: false; issues: ValidationIssue[] };

// Assembles unclaimed services in an episode into a claim, validating against
// the state ruleset and stamping codes, units, and charges. Atomic: either
// the claim and all its lines exist and the services are marked CLAIMED, or
// nothing changed.
export async function buildClaim(
  episodeId: string,
  serviceIds: string[],
  actorId?: string
): Promise<BuildClaimResult> {
  const episode = await prisma.careEpisode.findUniqueOrThrow({
    where: { id: episodeId },
    include: {
      client: { include: { payer: true } },
      doula: { include: { organization: true } },
      services: true,
    },
  });

  const ruleset = await getActiveRuleset(episode.client.state);
  if (!ruleset) {
    return {
      ok: false,
      issues: [
        {
          serviceId: "",
          code: "NO_RULESET",
          message: `No active StateRuleset for ${episode.client.state}. Author one before billing.`,
        },
      ],
    };
  }

  const services = episode.services.filter(
    (s) => serviceIds.includes(s.id) && (s.status === "LOGGED" || s.status === "VALIDATED")
  );
  if (services.length === 0) {
    return {
      ok: false,
      issues: [{ serviceId: "", code: "NO_SERVICES", message: "No billable services selected." }],
    };
  }

  const prior = episode.services.filter((s) => !serviceIds.includes(s.id));
  const { issues, stamped } = validateServices(services, episode, prior, ruleset);
  if (issues.length > 0) return { ok: false, issues };

  // Payer resolution: the client's MCO when assigned, else the state FFS payer.
  const payerId =
    episode.client.planType === "MCO" && episode.client.payerId
      ? episode.client.payerId
      : ruleset.defaultPayerId;
  if (!payerId) {
    return {
      ok: false,
      issues: [
        {
          serviceId: "",
          code: "NO_PAYER",
          message: "No payer resolvable: client has no MCO and the ruleset has no default FFS payer.",
        },
      ],
    };
  }

  const claimId = await prisma.$transaction(async (tx) => {
    let totalChargeCents = 0;
    const sorted = [...services].sort(
      (a, b) => a.serviceDate.getTime() - b.serviceDate.getTime()
    );

    const claim = await tx.claim.create({
      data: {
        claimNumber: newClaimNumber(),
        organizationId: episode.doula.organizationId,
        renderingDoulaId: episode.doulaId,
        episodeId: episode.id,
        payerId,
        status: "BUILT",
        totalChargeCents: 0,
      },
    });

    for (const [i, service] of sorted.entries()) {
      const s = stamped.get(service.id)!;
      totalChargeCents += s.chargeCents;
      await tx.service.update({
        where: { id: service.id },
        data: {
          procedureCode: s.procedureCode,
          modifier: s.modifier,
          units: s.units,
          placeOfService: s.placeOfService,
          diagnosisCodes: s.diagnosisCodes,
          chargeCents: s.chargeCents,
          status: "CLAIMED",
        },
      });
      await tx.claimLine.create({
        data: {
          claimId: claim.id,
          serviceId: service.id,
          lineNumber: i + 1,
          procedureCode: s.procedureCode,
          modifier: s.modifier,
          units: s.units,
          chargeCents: s.chargeCents,
        },
      });
    }

    await tx.claim.update({ where: { id: claim.id }, data: { totalChargeCents } });
    await tx.claimEvent.create({
      data: { claimId: claim.id, toStatus: "BUILT", source: "SYSTEM", message: "Claim built from ruleset" },
    });
    await auditTx(tx, {
      actorType: actorId ? "USER" : "SYSTEM",
      actorId,
      action: "CLAIM_BUILD",
      entityType: "Claim",
      entityId: claim.id,
      detail: { serviceIds, totalChargeCents },
    });
    return claim.id;
  });

  return { ok: true, claimId };
}

// Submits a built claim to the clearinghouse. Idempotent: a claim that has
// already left BUILT/REWORKING status is not resubmitted.
export async function submitClaim(claimId: string, actorId?: string) {
  const claim = await prisma.claim.findUniqueOrThrow({
    where: { id: claimId },
    include: {
      organization: { include: { enrollments: true } },
      renderingDoula: true,
      episode: { include: { client: true } },
      payer: true,
      lines: { include: { service: true }, orderBy: { lineNumber: "asc" } },
    },
  });

  if (claim.status !== "BUILT" && claim.status !== "REWORKING") {
    return { ok: false as const, error: `Claim is ${claim.status}; only BUILT or REWORKING claims can be submitted.` };
  }

  const enrollment = claim.organization.enrollments.find(
    (e) => e.state === claim.episode.client.state && e.status === "ACTIVE"
  );

  const submission: ClaimSubmission = {
    claimNumber: claim.claimNumber,
    billingProvider: {
      organizationName: claim.organization.name,
      npi: claim.organization.npi,
      taxId: claim.organization.taxId,
      taxonomyCode: claim.organization.taxonomyCode,
      medicaidProviderId: enrollment?.medicaidProviderId,
      address: {
        line1: claim.organization.addressLine1,
        city: claim.organization.city,
        state: claim.organization.state,
        zip: claim.organization.zip,
      },
    },
    renderingProvider: {
      firstName: claim.renderingDoula.firstName,
      lastName: claim.renderingDoula.lastName,
      npi: claim.renderingDoula.npi,
      taxonomyCode: claim.renderingDoula.taxonomyCode,
    },
    subscriber: {
      firstName: claim.episode.client.firstName,
      lastName: claim.episode.client.lastName,
      dob: isoDate(claim.episode.client.dob),
      memberId: claim.episode.client.medicaidId,
    },
    payer: {
      name: claim.payer.name,
      payerId: claim.payer.clearinghousePayerCode ?? claim.payer.externalPayerId,
    },
    lines: claim.lines.map((l) => ({
      lineNumber: l.lineNumber,
      procedureCode: l.procedureCode,
      modifier: l.modifier ?? undefined,
      units: l.units,
      chargeCents: l.chargeCents,
      serviceDate: isoDate(l.service.serviceDate),
      placeOfService: l.service.placeOfService ?? "12",
      diagnosisCodes: l.service.diagnosisCodes,
    })),
  };

  const result = await getClearinghouse().submitClaim(submission);

  if (result.ok) {
    await prisma.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          clearinghouseClaimId: result.clearinghouseClaimId,
        },
      });
      await tx.claimEvent.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: "SUBMITTED",
          source: "CLEARINGHOUSE",
          message: `Accepted by clearinghouse as ${result.clearinghouseClaimId}`,
        },
      });
      await auditTx(tx, {
        actorType: actorId ? "USER" : "SYSTEM",
        actorId,
        action: "CLAIM_SUBMIT",
        entityType: "Claim",
        entityId: claim.id,
        detail: { clearinghouseClaimId: result.clearinghouseClaimId },
      });
    });
    return { ok: true as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.claim.update({ where: { id: claim.id }, data: { status: "REJECTED" } });
    await tx.claimEvent.create({
      data: {
        claimId: claim.id,
        fromStatus: claim.status,
        toStatus: "REJECTED",
        source: "CLEARINGHOUSE",
        message: result.errors.join("; "),
      },
    });
    await auditTx(tx, {
      actorType: "SYSTEM",
      action: "CLAIM_REJECTED",
      entityType: "Claim",
      entityId: claim.id,
      detail: { errors: result.errors },
    });
  });
  return { ok: false as const, error: result.errors.join("; ") };
}

// Refreshes claim status from the clearinghouse (277-style inquiry).
export async function refreshClaimStatus(claimId: string) {
  const claim = await prisma.claim.findUniqueOrThrow({ where: { id: claimId } });
  if (!claim.clearinghouseClaimId) {
    return { ok: false as const, error: "Claim has no clearinghouse ID; submit it first." };
  }
  const status = await getClearinghouse().getClaimStatus(claim.clearinghouseClaimId);

  const map: Record<string, "ACCEPTED" | "REJECTED" | "PENDING" | null> = {
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    PENDING: "PENDING",
    FINALIZED: null, // wait for the 835 to set PAID/DENIED with amounts
  };
  const next = map[status.status];

  if (next && next !== claim.status) {
    await prisma.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: next,
          payerClaimControlNumber: status.payerClaimControlNumber ?? claim.payerClaimControlNumber,
        },
      });
      await tx.claimEvent.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: next,
          source: "PAYER",
          message: status.messages.join("; "),
        },
      });
    });
  }
  return { ok: true as const, status: status.status };
}
