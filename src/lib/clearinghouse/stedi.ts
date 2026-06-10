import type {
  ClaimStatusResult,
  ClaimSubmission,
  ClearinghouseAdapter,
  EligibilityRequest,
  EligibilityResult,
  RemittanceFile,
  SubmissionResult,
} from "./types";

// Stedi adapter skeleton.
//
// Stedi exposes JSON APIs for professional claims (837P), real-time
// eligibility (270/271), claim status (276/277), and translated 835s, plus
// webhooks for transaction delivery. Before implementing, verify the current
// endpoint paths, the JSON claim schema, payer coverage for the launch
// state's Medicaid and MCOs in Stedi's payer network, and sign a BAA.
export class StediAdapter implements ClearinghouseAdapter {
  readonly name = "stedi";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://healthcare.us.stedi.com/2024-04-01"
  ) {}

  async submitClaim(_claim: ClaimSubmission): Promise<SubmissionResult> {
    throw new Error(
      "StediAdapter.submitClaim not implemented. Verify the current Stedi professional-claims API before wiring."
    );
  }

  async getClaimStatus(_id: string): Promise<ClaimStatusResult> {
    throw new Error("StediAdapter.getClaimStatus not implemented.");
  }

  async checkEligibility(_req: EligibilityRequest): Promise<EligibilityResult> {
    throw new Error("StediAdapter.checkEligibility not implemented.");
  }

  async fetchRemittances(_since: Date): Promise<RemittanceFile[]> {
    throw new Error("StediAdapter.fetchRemittances not implemented.");
  }
}
