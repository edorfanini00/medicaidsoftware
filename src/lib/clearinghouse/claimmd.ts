import type {
  ClaimStatusResult,
  ClaimSubmission,
  ClearinghouseAdapter,
  EligibilityRequest,
  EligibilityResult,
  RemittanceFile,
  SubmissionResult,
} from "./types";

// Claim.MD adapter skeleton.
//
// Before implementing, verify against the current Claim.MD API docs:
// claim upload format and endpoint, 835/ERA retrieval, real-time eligibility
// (270/271), response/ack polling, and payer coverage for the launch state's
// Medicaid FFS program and each MCO. Confirm sandbox availability and request
// a BAA. Do not assume the endpoints below are current.
export class ClaimMdAdapter implements ClearinghouseAdapter {
  readonly name = "claimmd";

  constructor(
    private readonly accountKey: string,
    private readonly baseUrl = "https://svc.claim.md/services"
  ) {}

  async submitClaim(_claim: ClaimSubmission): Promise<SubmissionResult> {
    throw new Error(
      "ClaimMdAdapter.submitClaim not implemented. Verify the current Claim.MD upload API before wiring."
    );
  }

  async getClaimStatus(_id: string): Promise<ClaimStatusResult> {
    throw new Error("ClaimMdAdapter.getClaimStatus not implemented.");
  }

  async checkEligibility(_req: EligibilityRequest): Promise<EligibilityResult> {
    throw new Error("ClaimMdAdapter.checkEligibility not implemented.");
  }

  async fetchRemittances(_since: Date): Promise<RemittanceFile[]> {
    throw new Error("ClaimMdAdapter.fetchRemittances not implemented.");
  }
}
