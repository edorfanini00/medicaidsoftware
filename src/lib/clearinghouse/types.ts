// Internal abstraction over the claims clearinghouse. The application only
// talks to this interface so swapping Claim.MD for Stedi (or running both for
// payer-coverage gaps) does not ripple through the app.
//
// The shapes below are deliberately clearinghouse-neutral. Each adapter maps
// them to its vendor's API. They mirror the X12 concepts (837P, 835, 277,
// 270/271) without carrying the wire format.

export type ClaimSubmission = {
  claimNumber: string; // our patient control number (CLM01)
  billingProvider: {
    organizationName: string;
    npi: string; // Type 2
    taxId: string;
    taxonomyCode: string;
    medicaidProviderId?: string;
    address: { line1: string; city: string; state: string; zip: string };
  };
  renderingProvider: {
    firstName: string;
    lastName: string;
    npi: string; // Type 1
    taxonomyCode: string;
  };
  subscriber: {
    firstName: string;
    lastName: string;
    dob: string; // YYYY-MM-DD
    memberId: string; // Medicaid ID or MCO member ID
  };
  payer: {
    name: string;
    payerId: string; // clearinghouse routing code where set, else state payer ID
  };
  lines: Array<{
    lineNumber: number;
    procedureCode: string;
    modifier?: string;
    units: number;
    chargeCents: number;
    serviceDate: string; // YYYY-MM-DD
    placeOfService: string;
    diagnosisCodes: string[];
  }>;
};

export type SubmissionResult =
  | { ok: true; clearinghouseClaimId: string }
  | { ok: false; errors: string[] }; // front-end rejection (999/277CA level)

export type ClaimStatusResult = {
  status: "ACCEPTED" | "REJECTED" | "PENDING" | "FINALIZED";
  payerClaimControlNumber?: string;
  messages: string[];
};

export type EligibilityRequest = {
  memberId: string;
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  serviceDate: string; // YYYY-MM-DD
  payerId: string;
};

export type EligibilityResult = {
  status: "ACTIVE" | "INACTIVE" | "UNKNOWN" | "ERROR";
  payerName?: string;
  coverageDetails?: Record<string, unknown>;
  raw?: unknown;
};

// A parsed 835 as delivered by the clearinghouse.
export type RemittanceFile = {
  payerExternalId: string;
  remitDate: string; // YYYY-MM-DD
  checkOrEftNumber: string;
  claims: Array<{
    claimNumber: string; // echoes our CLM01 back to us
    payerClaimControlNumber: string;
    lines: Array<{
      lineNumber: number;
      paidCents: number;
      allowedCents?: number;
      adjustmentCents: number;
      adjustmentGroupCode?: string; // CO, PR, OA, PI
      reasonCodes: string[]; // CARC
      remarkCodes: string[]; // RARC
    }>;
  }>;
};

export interface ClearinghouseAdapter {
  readonly name: string;
  submitClaim(claim: ClaimSubmission): Promise<SubmissionResult>;
  getClaimStatus(clearinghouseClaimId: string): Promise<ClaimStatusResult>;
  checkEligibility(req: EligibilityRequest): Promise<EligibilityResult>;
  // Remittances newly available since the cursor. Adapters that support
  // webhooks can ignore this and push to the webhook endpoint instead.
  fetchRemittances(since: Date): Promise<RemittanceFile[]>;
}
