-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "DoulaStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FFS', 'MCO');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNKNOWN', 'ERROR');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('PRENATAL', 'LABOR_DELIVERY', 'POSTPARTUM');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('LOGGED', 'VALIDATED', 'CLAIMED', 'PAID', 'DENIED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('BUILT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'DENIED', 'REWORKING', 'VOID');

-- CreateEnum
CREATE TYPE "ClaimLineStatus" AS ENUM ('SUBMITTED', 'PAID', 'DENIED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('SYSTEM', 'USER', 'CLEARINGHOUSE', 'PAYER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('MEDICAID_FFS', 'MCO');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "npi" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "taxonomyCode" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgEnrollment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "payerId" TEXT,
    "medicaidProviderId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doula" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "npi" TEXT NOT NULL,
    "taxonomyCode" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "status" "DoulaStatus" NOT NULL DEFAULT 'ONBOARDING',
    "certifiedAt" TIMESTAMP(3),
    "payoutMethod" TEXT,
    "payoutAccountRef" TEXT,
    "feeBps" INTEGER NOT NULL DEFAULT 1500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoulaDocument" (
    "id" TEXT NOT NULL,
    "doulaId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoulaDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "doulaId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "medicaidId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL DEFAULT 'FFS',
    "payerId" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityCheck" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "status" "EligibilityStatus" NOT NULL,
    "payerName" TEXT,
    "coverageDetails" JSONB,
    "rawResponse" JSONB,

    CONSTRAINT "EligibilityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareEpisode" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "doulaId" TEXT NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "status" "EpisodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "doulaId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "procedureCode" TEXT,
    "modifier" TEXT,
    "units" INTEGER NOT NULL DEFAULT 1,
    "placeOfService" TEXT,
    "diagnosisCodes" TEXT[],
    "chargeCents" INTEGER NOT NULL DEFAULT 0,
    "status" "ServiceStatus" NOT NULL DEFAULT 'LOGGED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "renderingDoulaId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'BUILT',
    "totalChargeCents" INTEGER NOT NULL,
    "totalPaidCents" INTEGER NOT NULL DEFAULT 0,
    "clearinghouseClaimId" TEXT,
    "payerClaimControlNumber" TEXT,
    "submittedAt" TIMESTAMP(3),
    "resubmissionOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimLine" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "procedureCode" TEXT NOT NULL,
    "modifier" TEXT,
    "units" INTEGER NOT NULL,
    "chargeCents" INTEGER NOT NULL,
    "allowedCents" INTEGER,
    "paidCents" INTEGER NOT NULL DEFAULT 0,
    "adjustmentCents" INTEGER NOT NULL DEFAULT 0,
    "denialCodes" TEXT[],
    "remarkCodes" TEXT[],
    "status" "ClaimLineStatus" NOT NULL DEFAULT 'SUBMITTED',

    CONSTRAINT "ClaimLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimEvent" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "fromStatus" "ClaimStatus",
    "toStatus" "ClaimStatus" NOT NULL,
    "source" "EventSource" NOT NULL,
    "message" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemittanceAdvice" (
    "id" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "remitDate" TIMESTAMP(3) NOT NULL,
    "checkOrEftNumber" TEXT NOT NULL,
    "totalPaidCents" INTEGER NOT NULL,
    "raw" JSONB,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemittanceAdvice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemittanceLine" (
    "id" TEXT NOT NULL,
    "remittanceId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "claimLineId" TEXT NOT NULL,
    "paidCents" INTEGER NOT NULL,
    "allowedCents" INTEGER,
    "adjustmentCents" INTEGER NOT NULL DEFAULT 0,
    "adjustmentGroupCode" TEXT,
    "reasonCodes" TEXT[],
    "remarkCodes" TEXT[],

    CONSTRAINT "RemittanceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "doulaId" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "railRef" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutLine" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "claimLineId" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,

    CONSTRAINT "PayoutLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "payerType" "PayerType" NOT NULL,
    "externalPayerId" TEXT NOT NULL,
    "clearinghousePayerCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateRuleset" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "defaultDiagnosisCodes" TEXT[],
    "defaultPlaceOfService" TEXT NOT NULL,
    "notes" TEXT,
    "defaultPayerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateRuleset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCodeRule" (
    "id" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "procedureCode" TEXT NOT NULL,
    "modifier" TEXT,
    "unitsPerVisit" INTEGER NOT NULL DEFAULT 1,
    "rateCents" INTEGER NOT NULL,
    "maxVisitsPerEpisode" INTEGER,
    "placeOfService" TEXT,
    "allowedDiagnosisCodes" TEXT[],
    "requiresDeliveryDate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ServiceCodeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_npi_key" ON "Organization"("npi");

-- CreateIndex
CREATE UNIQUE INDEX "OrgEnrollment_organizationId_state_payerId_key" ON "OrgEnrollment"("organizationId", "state", "payerId");

-- CreateIndex
CREATE UNIQUE INDEX "Doula_email_key" ON "Doula"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doula_npi_key" ON "Doula"("npi");

-- CreateIndex
CREATE UNIQUE INDEX "Client_medicaidId_state_key" ON "Client"("medicaidId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimLine_claimId_lineNumber_key" ON "ClaimLine"("claimId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RemittanceAdvice_payerId_checkOrEftNumber_key" ON "RemittanceAdvice"("payerId", "checkOrEftNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutLine_claimLineId_key" ON "PayoutLine"("claimLineId");

-- CreateIndex
CREATE UNIQUE INDEX "Payer_state_externalPayerId_key" ON "Payer"("state", "externalPayerId");

-- CreateIndex
CREATE UNIQUE INDEX "StateRuleset_state_version_key" ON "StateRuleset"("state", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCodeRule_rulesetId_serviceType_procedureCode_key" ON "ServiceCodeRule"("rulesetId", "serviceType", "procedureCode");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "OrgEnrollment" ADD CONSTRAINT "OrgEnrollment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgEnrollment" ADD CONSTRAINT "OrgEnrollment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doula" ADD CONSTRAINT "Doula_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoulaDocument" ADD CONSTRAINT "DoulaDocument_doulaId_fkey" FOREIGN KEY ("doulaId") REFERENCES "Doula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_doulaId_fkey" FOREIGN KEY ("doulaId") REFERENCES "Doula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityCheck" ADD CONSTRAINT "EligibilityCheck_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareEpisode" ADD CONSTRAINT "CareEpisode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareEpisode" ADD CONSTRAINT "CareEpisode_doulaId_fkey" FOREIGN KEY ("doulaId") REFERENCES "Doula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "CareEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_doulaId_fkey" FOREIGN KEY ("doulaId") REFERENCES "Doula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_renderingDoulaId_fkey" FOREIGN KEY ("renderingDoulaId") REFERENCES "Doula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "CareEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimLine" ADD CONSTRAINT "ClaimLine_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimLine" ADD CONSTRAINT "ClaimLine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvent" ADD CONSTRAINT "ClaimEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemittanceAdvice" ADD CONSTRAINT "RemittanceAdvice_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemittanceLine" ADD CONSTRAINT "RemittanceLine_remittanceId_fkey" FOREIGN KEY ("remittanceId") REFERENCES "RemittanceAdvice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemittanceLine" ADD CONSTRAINT "RemittanceLine_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemittanceLine" ADD CONSTRAINT "RemittanceLine_claimLineId_fkey" FOREIGN KEY ("claimLineId") REFERENCES "ClaimLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_doulaId_fkey" FOREIGN KEY ("doulaId") REFERENCES "Doula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLine" ADD CONSTRAINT "PayoutLine_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLine" ADD CONSTRAINT "PayoutLine_claimLineId_fkey" FOREIGN KEY ("claimLineId") REFERENCES "ClaimLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateRuleset" ADD CONSTRAINT "StateRuleset_defaultPayerId_fkey" FOREIGN KEY ("defaultPayerId") REFERENCES "Payer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCodeRule" ADD CONSTRAINT "ServiceCodeRule_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "StateRuleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

