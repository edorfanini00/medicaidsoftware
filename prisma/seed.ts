import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Development seed. Every identifier, code, and rate below is EXAMPLE data.
// Before billing a real state, replace the ruleset with codes, modifiers,
// units, limits, and rates pulled from that state's Medicaid fee schedule and
// billing manual, and replace payer IDs with the clearinghouse's payer list.
async function main() {
  const org = await prisma.organization.upsert({
    where: { npi: "1999999992" },
    update: {},
    create: {
      name: "Example Doula Billing Co",
      npi: "1999999992", // EXAMPLE Type 2 NPI
      taxId: "00-0000000",
      taxonomyCode: "374J00000X", // doula taxonomy; verify org-level taxonomy per state
      addressLine1: "100 Main St",
      city: "Minneapolis",
      state: "MN",
      zip: "55401",
      contactEmail: "billing@example.com",
    },
  });

  const ffs = await prisma.payer.upsert({
    where: { state_externalPayerId: { state: "MN", externalPayerId: "MNFFS-EXAMPLE" } },
    update: {},
    create: {
      name: "Example State Medicaid FFS",
      state: "MN",
      payerType: "MEDICAID_FFS",
      externalPayerId: "MNFFS-EXAMPLE",
    },
  });

  const mco = await prisma.payer.upsert({
    where: { state_externalPayerId: { state: "MN", externalPayerId: "MNMCO-EXAMPLE" } },
    update: {},
    create: {
      name: "Example Managed Care Plan",
      state: "MN",
      payerType: "MCO",
      externalPayerId: "MNMCO-EXAMPLE",
    },
  });

  await prisma.orgEnrollment.upsert({
    where: {
      organizationId_state_payerId: { organizationId: org.id, state: "MN", payerId: ffs.id },
    },
    update: {},
    create: {
      organizationId: org.id,
      state: "MN",
      payerId: ffs.id,
      medicaidProviderId: "MN-PROV-EXAMPLE",
      effectiveDate: new Date("2026-01-01"),
      status: "ACTIVE",
    },
  });

  const existing = await prisma.stateRuleset.findFirst({ where: { state: "MN", version: 1 } });
  if (!existing) {
    await prisma.stateRuleset.create({
      data: {
        state: "MN",
        version: 1,
        effectiveDate: new Date("2026-01-01"),
        active: true,
        defaultDiagnosisCodes: ["Z33.1"], // pregnant state, incidental; verify per state policy
        defaultPlaceOfService: "12", // home; verify allowed POS per state
        defaultPayerId: ffs.id,
        notes:
          "EXAMPLE RULESET. Codes, rates, units, and limits are placeholders. Replace with the state's published doula fee schedule and billing manual before submitting real claims.",
        codeRules: {
          create: [
            {
              serviceType: "PRENATAL",
              procedureCode: "T1032", // EXAMPLE; verify state code and modifier
              unitsPerVisit: 1,
              rateCents: 7500,
              maxVisitsPerEpisode: 6,
            },
            {
              serviceType: "POSTPARTUM",
              procedureCode: "T1032",
              modifier: "TG", // EXAMPLE modifier
              unitsPerVisit: 1,
              rateCents: 7500,
              maxVisitsPerEpisode: 6,
            },
            {
              serviceType: "LABOR_DELIVERY",
              procedureCode: "T1033", // EXAMPLE
              unitsPerVisit: 1,
              rateCents: 60000,
              maxVisitsPerEpisode: 1,
              requiresDeliveryDate: true,
            },
          ],
        },
      },
    });
  }

  const doula = await prisma.doula.upsert({
    where: { npi: "1888888888" },
    update: {},
    create: {
      organizationId: org.id,
      firstName: "Dana",
      lastName: "Example",
      email: "dana@example.com",
      npi: "1888888888", // EXAMPLE Type 1 NPI
      taxonomyCode: "374J00000X",
      state: "MN",
      status: "ACTIVE",
      feeBps: 1500,
    },
  });

  await prisma.client.upsert({
    where: { medicaidId_state: { medicaidId: "MN12345678", state: "MN" } },
    update: {},
    create: {
      doulaId: doula.id,
      firstName: "Maria",
      lastName: "Sample",
      dob: new Date("1996-04-12"),
      medicaidId: "MN12345678",
      state: "MN",
      planType: "FFS",
      episodes: { create: { doulaId: doula.id, expectedDeliveryDate: new Date("2026-09-15") } },
    },
  });

  console.log("Seeded example org, payers, MN ruleset, doula, and client.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
