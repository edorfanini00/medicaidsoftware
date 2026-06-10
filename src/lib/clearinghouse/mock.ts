import type {
  ClaimStatusResult,
  ClaimSubmission,
  ClearinghouseAdapter,
  EligibilityRequest,
  EligibilityResult,
  RemittanceFile,
  SubmissionResult,
} from "./types";

// Development adapter. Deterministic enough to exercise the whole pipeline
// (submit, accept, pay, deny) without a clearinghouse account. Claims whose
// subscriber last name starts with "Z" are denied so denial handling can be
// tested end to end.
export class MockClearinghouse implements ClearinghouseAdapter {
  readonly name = "mock";

  private submitted = new Map<string, ClaimSubmission>();

  async submitClaim(claim: ClaimSubmission): Promise<SubmissionResult> {
    if (!claim.renderingProvider.npi || claim.renderingProvider.npi.length !== 10) {
      return { ok: false, errors: ["Rendering provider NPI must be 10 digits"] };
    }
    if (claim.lines.length === 0) {
      return { ok: false, errors: ["Claim has no service lines"] };
    }
    const id = `MOCK-${claim.claimNumber}`;
    this.submitted.set(id, claim);
    return { ok: true, clearinghouseClaimId: id };
  }

  async getClaimStatus(clearinghouseClaimId: string): Promise<ClaimStatusResult> {
    return {
      status: "ACCEPTED",
      payerClaimControlNumber: clearinghouseClaimId.replace("MOCK-", "ICN-"),
      messages: ["Accepted by mock payer front end"],
    };
  }

  async checkEligibility(req: EligibilityRequest): Promise<EligibilityResult> {
    if (req.memberId.endsWith("0")) {
      return { status: "INACTIVE", payerName: "Mock State Medicaid" };
    }
    return {
      status: "ACTIVE",
      payerName: "Mock State Medicaid",
      coverageDetails: { doulaBenefit: true, planType: "FFS" },
    };
  }

  async fetchRemittances(): Promise<RemittanceFile[]> {
    const files: RemittanceFile[] = [];
    for (const [id, claim] of this.submitted) {
      const deny = claim.subscriber.lastName.toUpperCase().startsWith("Z");
      files.push({
        payerExternalId: claim.payer.payerId,
        remitDate: new Date().toISOString().slice(0, 10),
        checkOrEftNumber: `EFT-${id}`,
        claims: [
          {
            claimNumber: claim.claimNumber,
            payerClaimControlNumber: id.replace("MOCK-", "ICN-"),
            lines: claim.lines.map((l) => ({
              lineNumber: l.lineNumber,
              paidCents: deny ? 0 : l.chargeCents,
              allowedCents: deny ? 0 : l.chargeCents,
              adjustmentCents: deny ? l.chargeCents : 0,
              adjustmentGroupCode: deny ? "CO" : undefined,
              reasonCodes: deny ? ["96"] : [], // CARC 96: non-covered charge
              remarkCodes: [],
            })),
          },
        ],
      });
    }
    this.submitted.clear();
    return files;
  }
}
