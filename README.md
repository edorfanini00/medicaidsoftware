# Medicaid Doula Billing System

A narrow, vertical revenue-cycle-management (RCM) application for doula services billed to Medicaid. The company is the billing provider (organization, Type 2 NPI); doulas operate under it as rendering providers (individual, Type 1 NPI). Medicaid pays the organization, the organization pays the doulas their share minus a fee.

## What it does

1. Onboards doulas under the organization (NPI, taxonomy, fee split).
2. Captures clients and their Medicaid coverage, opening a care episode per pregnancy.
3. Checks client eligibility (270/271) before service and stores the evidence.
4. Records services (prenatal visits, labor and delivery support, postpartum visits).
5. Builds compliant claims (837P shape) from services, validated against the state's ruleset.
6. Submits claims through a clearinghouse abstraction (Claim.MD and Stedi adapters stubbed, mock adapter for development).
7. Ingests remittances (835) idempotently, updating claim and line statuses and queueing denials.
8. Computes doula payouts from paid claim lines on an auditable ledger.

## Architecture

- Next.js (App Router) for the UI and API layer
- Postgres via Prisma as the system of record (money in integer cents)
- `src/lib/billing` is the billing engine: validation, claim build, submission, remittance application, payouts
- `src/lib/rulesets` reads the per-state configuration; there is no state-specific branching in code
- `src/lib/clearinghouse` is the vendor abstraction: a `ClearinghouseAdapter` interface, a deterministic mock for development, and skeletons for Claim.MD and Stedi
- Append-only `AuditLog` and `ClaimEvent` tables for audit and claim history

### The per-state rules engine

`StateRuleset` + `ServiceCodeRule` + `Payer` rows fully describe a state: covered codes, modifiers, units, rates, visit limits, default diagnosis and place of service, and the payer list (FFS and MCOs). The claim builder and validator read only from the active ruleset. Adding a state is authoring data, not writing code.

## Getting started

```bash
cp .env.example .env
docker compose up -d          # Postgres 16 on localhost:5432
npm install
npx prisma migrate dev        # create schema
npx prisma db seed            # example org, MN ruleset, doula, client
npm run dev
```

Open http://localhost:3000. With `CLEARINGHOUSE=mock` you can exercise the full pipeline: log services on a client, build a claim, submit it, then click "Pull remittances (835)" on the Claims page to simulate payer payment, then generate payouts. Clients whose last name starts with "Z" get denied by the mock payer, and Medicaid IDs ending in "0" come back ineligible, so the failure paths are testable too.

## API surface

| Route | Purpose |
| --- | --- |
| `POST /api/doulas` | Onboard a rendering provider |
| `POST /api/clients` | Client intake; opens the care episode |
| `POST /api/eligibility` | Run and store a 270/271 check |
| `POST /api/services` | Log a visit or delivery |
| `POST /api/claims` | Build a claim from services (ruleset-validated) |
| `POST /api/claims/:id/submit` | Submit to the clearinghouse |
| `POST /api/claims/:id/refresh-status` | 277-style status refresh |
| `POST /api/webhooks/clearinghouse` | Push remittance ingestion (idempotent) |
| `POST /api/remittances/poll` | Pull remittance ingestion |
| `POST /api/payouts` | Generate payouts from paid lines |
| `POST /api/payouts/:id/mark-paid` | Record rail execution |

## Deploying to Vercel

The app queries Postgres on every page, so a deployment without a database serves errors. Required steps:

1. In the Vercel dashboard: project, Storage tab, Create Database, pick a Postgres provider (Neon free tier works). Accepting the defaults injects `DATABASE_URL` into the project's environment variables automatically.
2. Set `CLEARINGHOUSE=mock` in the project's environment variables (until a real clearinghouse adapter is implemented).
3. Redeploy. The build runs `prisma migrate deploy`, which creates the schema.
4. Seed once from your machine against the hosted database: `vercel env pull .env.production.local && DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d'"' -f2) npx prisma db seed`

Do not put real client data (PHI) on a standard Vercel plan; HIPAA requires a BAA with the hosting provider, which Vercel only offers on enterprise agreements.

## Before billing real claims (do not skip)

The seed data is EXAMPLE data. Specifics in this repo that must be verified against primary sources before production:

- The launch state's exact doula service codes, modifiers, units, visit limits, and rates, from its Medicaid billing manual and fee schedule. The seeded T-codes are placeholders.
- Whether the state pays via FFS, managed care, or both, and the payer IDs for each MCO.
- The chosen clearinghouse's current API (837P submission, 835/277 retrieval, 270/271), sandbox, payer coverage for the state and its MCOs, and pricing. The Claim.MD and Stedi adapters in `src/lib/clearinghouse` are skeletons that throw until verified and implemented.
- Provider enrollment requirements: which identifiers the claim must carry for the org and the rendering doula in that state.
- Current X12 version and state companion-guide edits.
- The webhook authentication placeholder must be replaced with the vendor's real signature scheme.

## Compliance notes

This system handles PHI, so HIPAA applies:

- Run Postgres with encryption at rest; all transport over TLS.
- Sign BAAs with the clearinghouse, hosting provider, and any payout vendor that touches PHI.
- `AuditLog` is append-only by convention; enforce at the database level (revoke UPDATE/DELETE) in production.
- Authentication and per-doula row-level access control are not yet implemented and are required before any real client data enters the system. Doulas must see only their own clients.
- Keep clearinghouse keys and payer credentials server-side only.
- Bank details for payouts belong in the payout rail's vault, not this database; only store references.

## Roadmap (build phases)

- Phase 1 (this repo): domain model, onboarding, eligibility, ruleset-driven claim build, manual-ish submission for one state. Validate with a few real claims before automating heavily.
- Phase 2: real clearinghouse adapter, background job queue for submission, status polling, and 835 ingestion with denial rework flows.
- Phase 3: payout rail integration, deposit reconciliation dashboard, second state ruleset to prove the abstraction.
- Phase 4: hardening, audit, adjacent provider types (community health workers, lactation consultants) on the same engine.
