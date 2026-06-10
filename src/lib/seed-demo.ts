import type { PrismaClient, ServiceType } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const FEE_BPS = 1500;
const RATE = { PRENATAL: 7500, POSTPARTUM: 7500, LABOR_DELIVERY: 60000 } as const;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAhead(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Development and demo seed. Every identifier, code, and rate is EXAMPLE
// data. Replace the ruleset contents with the launch state's published fee
// schedule before any real claim is submitted.
export async function seedDemo(prisma: PrismaClient) {
  // Wipe in dependency order so the seed is rerunnable.
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.session.deleteMany(),
    prisma.payoutLine.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.remittanceLine.deleteMany(),
    prisma.remittanceAdvice.deleteMany(),
    prisma.claimEvent.deleteMany(),
    prisma.claimLine.deleteMany(),
    prisma.claim.deleteMany(),
    prisma.service.deleteMany(),
    prisma.eligibilityCheck.deleteMany(),
    prisma.consentRecord.deleteMany(),
    prisma.intakeLink.deleteMany(),
    prisma.careEpisode.deleteMany(),
    prisma.client.deleteMany(),
    prisma.user.deleteMany(),
    prisma.doulaDocument.deleteMany(),
    prisma.doula.deleteMany(),
    prisma.serviceCodeRule.deleteMany(),
    prisma.stateRuleset.deleteMany(),
    prisma.orgEnrollment.deleteMany(),
    prisma.payer.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  const org = await prisma.organization.create({
    data: {
      name: "Maren Health Billing LLC",
      npi: "1999999992", // EXAMPLE Type 2 NPI
      taxId: "00-0000000",
      taxonomyCode: "374J00000X",
      addressLine1: "100 Main St",
      city: "Minneapolis",
      state: "MN",
      zip: "55401",
      contactEmail: "billing@maren.example",
    },
  });

  const ffs = await prisma.payer.create({
    data: {
      name: "MN Medicaid (FFS)",
      state: "MN",
      payerType: "MEDICAID_FFS",
      externalPayerId: "MNFFS-EXAMPLE",
    },
  });
  const mco = await prisma.payer.create({
    data: {
      name: "BluePlus of Minnesota (MCO)",
      state: "MN",
      payerType: "MCO",
      externalPayerId: "MNMCO-EXAMPLE",
    },
  });

  await prisma.orgEnrollment.createMany({
    data: [
      {
        organizationId: org.id,
        state: "MN",
        payerId: ffs.id,
        medicaidProviderId: "MN-PROV-EXAMPLE",
        effectiveDate: new Date("2026-01-01"),
        status: "ACTIVE",
      },
      {
        organizationId: org.id,
        state: "MN",
        payerId: mco.id,
        medicaidProviderId: "MN-MCO-PROV-EXAMPLE",
        effectiveDate: new Date("2026-01-01"),
        status: "ACTIVE",
      },
    ],
  });

  await prisma.stateRuleset.create({
    data: {
      state: "MN",
      version: 1,
      effectiveDate: new Date("2026-01-01"),
      active: true,
      defaultDiagnosisCodes: ["Z33.1"],
      defaultPlaceOfService: "12",
      defaultPayerId: ffs.id,
      notes:
        "EXAMPLE RULESET. Codes, rates, units, and limits are placeholders. Replace with the state's published doula fee schedule and billing manual before submitting real claims.",
      codeRules: {
        create: [
          { serviceType: "PRENATAL", procedureCode: "T1032", unitsPerVisit: 1, rateCents: RATE.PRENATAL, maxVisitsPerEpisode: 6 },
          { serviceType: "POSTPARTUM", procedureCode: "T1032", modifier: "TG", unitsPerVisit: 1, rateCents: RATE.POSTPARTUM, maxVisitsPerEpisode: 6 },
          { serviceType: "LABOR_DELIVERY", procedureCode: "T1033", unitsPerVisit: 1, rateCents: RATE.LABOR_DELIVERY, maxVisitsPerEpisode: 1, requiresDeliveryDate: true },
        ],
      },
    },
  });

  const jamie = await prisma.doula.create({
    data: {
      organizationId: org.id,
      firstName: "Jamie",
      lastName: "Reyes",
      email: "jamie@example.com",
      npi: "1888888888",
      taxonomyCode: "374J00000X",
      state: "MN",
      status: "ACTIVE",
      certifiedAt: new Date("2025-03-10"),
      payoutMethod: "ACH",
      feeBps: FEE_BPS,
      documents: {
        create: [
          { kind: "TRAINING_CERTIFICATE", fileName: "doula-certification.pdf", storageKey: "demo/cert.pdf" },
          { kind: "SIGNED_AGREEMENT", fileName: "maren-agreement-signed.pdf", storageKey: "demo/agreement.pdf" },
        ],
      },
    },
  });

  const second = await prisma.doula.create({
    data: {
      organizationId: org.id,
      firstName: "Asha",
      lastName: "Okafor",
      email: "asha@example.com",
      npi: "1777777771",
      taxonomyCode: "374J00000X",
      state: "MN",
      status: "ACTIVE",
      payoutMethod: "ACH",
      feeBps: FEE_BPS,
    },
  });

  const password = hashPassword("maren-demo");
  await prisma.user.createMany({
    data: [
      { email: "admin@example.com", passwordHash: password, name: "Avery Founder", role: "ADMIN" },
      { email: "jamie@example.com", passwordHash: password, name: "Jamie Reyes", role: "DOULA", doulaId: jamie.id },
      { email: "asha@example.com", passwordHash: password, name: "Asha Okafor", role: "DOULA", doulaId: second.id },
    ],
  });

  let claimSeq = 1;
  const newClaimNumber = () => `DLA2026${String(claimSeq++).padStart(4, "0")}`;

  // Builds one family with services and a claim in the given state of the
  // pipeline, writing the same records the real pipeline writes.
  async function makeFamily(opts: {
    doulaId: string;
    firstName: string;
    lastName: string;
    medicaidId: string;
    payerId: string;
    planType?: "FFS" | "MCO";
    delivered?: number; // days ago, undefined = not delivered
    due?: number; // days ahead
    prenatal: number;
    postpartum?: number;
    claimState?: "PAID" | "SUBMITTED" | "DENIED" | "NONE";
    claimAge?: number; // days ago for submission
    extraUnclaimedPrenatal?: number;
    eligibility?: "ACTIVE" | "INACTIVE";
    closed?: boolean;
  }) {
    const client = await prisma.client.create({
      data: {
        doulaId: opts.doulaId,
        firstName: opts.firstName,
        lastName: opts.lastName,
        dob: new Date("1995-06-15"),
        medicaidId: opts.medicaidId,
        state: "MN",
        planType: opts.planType ?? "FFS",
        payerId: opts.planType === "MCO" ? opts.payerId : undefined,
        episodes: {
          create: {
            doulaId: opts.doulaId,
            expectedDeliveryDate: opts.due != null ? daysAhead(opts.due) : opts.delivered != null ? daysAgo(opts.delivered) : undefined,
            actualDeliveryDate: opts.delivered != null ? daysAgo(opts.delivered) : undefined,
            status: opts.closed ? "COMPLETED" : "ACTIVE",
          },
        },
      },
      include: { episodes: true },
    });
    const episode = client.episodes[0];

    await prisma.eligibilityCheck.create({
      data: {
        clientId: client.id,
        serviceDate: daysAgo(60),
        status: opts.eligibility ?? "ACTIVE",
        payerName: "MN Medicaid",
        coverageDetails: { doulaBenefit: true },
      },
    });
    await prisma.consentRecord.create({
      data: {
        clientId: client.id,
        kind: "BILLING_AUTHORIZATION",
        signedName: `${opts.firstName} ${opts.lastName}`,
        consentText: "I authorize claims to be submitted to my Medicaid plan for doula services provided to me.",
      },
    });

    // Services that will go on the claim.
    const claimable: Array<{ type: ServiceType; date: Date; charge: number; mod?: string }> = [];
    const baseDay = opts.delivered != null ? opts.delivered + 60 : 90;
    for (let i = 0; i < opts.prenatal; i++) {
      claimable.push({ type: "PRENATAL", date: daysAgo(baseDay - i * 10), charge: RATE.PRENATAL });
    }
    if (opts.delivered != null) {
      claimable.push({ type: "LABOR_DELIVERY", date: daysAgo(opts.delivered), charge: RATE.LABOR_DELIVERY });
      for (let i = 0; i < (opts.postpartum ?? 0); i++) {
        claimable.push({ type: "POSTPARTUM", date: daysAgo(opts.delivered - 5 - i * 7), charge: RATE.POSTPARTUM, mod: "TG" });
      }
    }

    const hasClaim = opts.claimState && opts.claimState !== "NONE" && claimable.length > 0;
    const serviceStatus =
      opts.claimState === "PAID" ? "PAID" : opts.claimState === "DENIED" ? "DENIED" : hasClaim ? "CLAIMED" : "LOGGED";

    const serviceIds: string[] = [];
    for (const s of claimable) {
      const created = await prisma.service.create({
        data: {
          episodeId: episode.id,
          doulaId: opts.doulaId,
          serviceType: s.type,
          serviceDate: s.date,
          procedureCode: hasClaim ? (s.type === "LABOR_DELIVERY" ? "T1033" : "T1032") : undefined,
          modifier: hasClaim ? s.mod : undefined,
          units: 1,
          placeOfService: hasClaim ? "12" : undefined,
          diagnosisCodes: hasClaim ? ["Z33.1"] : [],
          chargeCents: hasClaim ? s.charge : 0,
          status: serviceStatus,
        },
      });
      serviceIds.push(created.id);
    }

    // Recently logged visits not yet on any claim.
    for (let i = 0; i < (opts.extraUnclaimedPrenatal ?? 0); i++) {
      await prisma.service.create({
        data: {
          episodeId: episode.id,
          doulaId: opts.doulaId,
          serviceType: "PRENATAL",
          serviceDate: daysAgo(7 - i * 3),
          status: "LOGGED",
        },
      });
    }

    if (!hasClaim) return { client, episode, claim: null };

    const totalCharge = claimable.reduce((a, s) => a + s.charge, 0);
    const paid = opts.claimState === "PAID";
    const denied = opts.claimState === "DENIED";
    const submittedAt = daysAgo(opts.claimAge ?? 20);

    const claim = await prisma.claim.create({
      data: {
        claimNumber: newClaimNumber(),
        organizationId: org.id,
        renderingDoulaId: opts.doulaId,
        episodeId: episode.id,
        payerId: opts.payerId,
        status: paid ? "PAID" : denied ? "DENIED" : "SUBMITTED",
        totalChargeCents: totalCharge,
        totalPaidCents: paid ? totalCharge : 0,
        clearinghouseClaimId: `MOCK-CH-${claimSeq}`,
        payerClaimControlNumber: paid || denied ? `ICN-${claimSeq}` : undefined,
        submittedAt,
        lines: {
          create: claimable.map((s, i) => ({
            serviceId: serviceIds[i],
            lineNumber: i + 1,
            procedureCode: s.type === "LABOR_DELIVERY" ? "T1033" : "T1032",
            modifier: s.mod,
            units: 1,
            chargeCents: s.charge,
            allowedCents: paid ? s.charge : denied ? 0 : undefined,
            paidCents: paid ? s.charge : 0,
            adjustmentCents: denied ? s.charge : 0,
            denialCodes: denied ? ["96"] : [],
            status: paid ? "PAID" : denied ? "DENIED" : "SUBMITTED",
          })),
        },
        events: {
          create: [
            { toStatus: "BUILT", source: "SYSTEM", message: "Claim built from ruleset", createdAt: submittedAt },
            { fromStatus: "BUILT", toStatus: "SUBMITTED", source: "CLEARINGHOUSE", message: "Accepted by clearinghouse", createdAt: submittedAt },
            ...(paid
              ? [{ fromStatus: "SUBMITTED" as const, toStatus: "PAID" as const, source: "PAYER" as const, message: "835 posted in full", createdAt: daysAgo((opts.claimAge ?? 20) - 14) }]
              : []),
            ...(denied
              ? [{ fromStatus: "SUBMITTED" as const, toStatus: "DENIED" as const, source: "PAYER" as const, message: "835 posted: CARC 96 non-covered charge", createdAt: daysAgo((opts.claimAge ?? 20) - 12) }]
              : []),
          ],
        },
      },
      include: { lines: true },
    });

    return { client, episode, claim };
  }

  // --- Jamie's portfolio -------------------------------------------------
  // Nine completed, paid births this year.
  const paidClaims = [];
  const pastNames: Array<[string, string]> = [
    ["Lena", "Torres"], ["Amara", "Diallo"], ["Sofia", "Hernandez"], ["Grace", "Lindqvist"],
    ["Naomi", "Carter"], ["Priya", "Natarajan"], ["Hana", "Yusuf"], ["Elena", "Petrov"], ["Rosa", "Alvarez"],
  ];
  for (let i = 0; i < pastNames.length; i++) {
    const [first, last] = pastNames[i];
    const r = await makeFamily({
      doulaId: jamie.id,
      firstName: first,
      lastName: last,
      medicaidId: `MN10${String(i).padStart(6, "0")}1`,
      payerId: i % 3 === 0 ? mco.id : ffs.id,
      planType: i % 3 === 0 ? "MCO" : "FFS",
      delivered: 30 + i * 25,
      prenatal: 5,
      postpartum: 2,
      claimState: "PAID",
      claimAge: 40 + i * 25,
      closed: i > 0, // Lena stays active in postpartum
    });
    paidClaims.push(r.claim!);
  }

  // Active families: Maya 32 weeks with a submitted claim, plus one early
  // family with only logged visits, plus one denied claim being handled.
  await makeFamily({
    doulaId: jamie.id,
    firstName: "Maya",
    lastName: "Anderson",
    medicaidId: "MN20000001",
    payerId: ffs.id,
    due: 56, // ~32 weeks
    prenatal: 4,
    claimState: "SUBMITTED",
    claimAge: 9,
    extraUnclaimedPrenatal: 0,
  });
  await makeFamily({
    doulaId: jamie.id,
    firstName: "Whitney",
    lastName: "Zhao",
    medicaidId: "MN20000002",
    payerId: ffs.id,
    due: 140,
    prenatal: 0,
    claimState: "NONE",
    extraUnclaimedPrenatal: 2,
  });
  await makeFamily({
    doulaId: jamie.id,
    firstName: "Dana",
    lastName: "Whitfield",
    medicaidId: "MN20000003",
    payerId: ffs.id,
    due: 84,
    prenatal: 1,
    claimState: "DENIED",
    claimAge: 18,
  });

  // Asha's smaller portfolio for the admin portfolio view.
  await makeFamily({
    doulaId: second.id,
    firstName: "Imani",
    lastName: "Brooks",
    medicaidId: "MN30000001",
    payerId: mco.id,
    planType: "MCO",
    delivered: 45,
    prenatal: 6,
    postpartum: 1,
    claimState: "PAID",
    claimAge: 60,
  });
  await makeFamily({
    doulaId: second.id,
    firstName: "Tessa",
    lastName: "Nguyen",
    medicaidId: "MN30000002",
    payerId: ffs.id,
    due: 100,
    prenatal: 2,
    claimState: "SUBMITTED",
    claimAge: 5,
  });

  // --- Remittances: most reconciled, one outstanding ----------------------
  for (let i = 0; i < 3; i++) {
    const claim = paidClaims[i];
    await prisma.remittanceAdvice.create({
      data: {
        payerId: claim.payerId,
        remitDate: daysAgo(20 + i * 20),
        checkOrEftNumber: `EFT-2026-${1000 + i}`,
        totalPaidCents: claim.totalPaidCents,
        reconciledAt: i === 0 ? undefined : daysAgo(15 + i * 20),
        lines: {
          create: claim.lines.map((l) => ({
            claimId: claim.id,
            claimLineId: l.id,
            paidCents: l.paidCents,
            allowedCents: l.paidCents,
            adjustmentCents: 0,
            reasonCodes: [],
            remarkCodes: [],
          })),
        },
      },
    });
  }

  // --- Payouts: most paid, one pending ------------------------------------
  for (let i = 0; i < paidClaims.length; i++) {
    const claim = paidClaims[i];
    const lines = claim.lines;
    const gross = lines.reduce((a, l) => a + l.paidCents, 0);
    const fee = lines.reduce((a, l) => a + Math.floor((l.paidCents * FEE_BPS) / 10000), 0);
    const pending = i === 0;
    await prisma.payout.create({
      data: {
        doulaId: jamie.id,
        grossCents: gross,
        feeCents: fee,
        netCents: gross - fee,
        status: pending ? "PENDING" : "PAID",
        railRef: pending ? undefined : `ACH-2026-${2000 + i}`,
        paidAt: pending ? undefined : daysAgo(20 + i * 25),
        lines: {
          create: lines.map((l) => {
            const lineFee = Math.floor((l.paidCents * FEE_BPS) / 10000);
            return { claimLineId: l.id, grossCents: l.paidCents, feeCents: lineFee, netCents: l.paidCents - lineFee };
          }),
        },
      },
    });
  }

  console.log("Seeded Maren demo data.");
  console.log("Sign in: jamie@example.com (doula) or admin@example.com (admin), password: maren-demo");
}
