// Claim adjustment reason codes (CARC) translated into operator language.
// Not exhaustive; extend as the launch state's real denial patterns emerge.
// Source for the full list: the X12 CARC code set.
export const CARC: Record<string, string> = {
  "1": "Deductible amount",
  "16": "Claim lacks information or has a submission error. Check required fields and resubmit.",
  "18": "Duplicate claim. The payer already has this one.",
  "22": "Care may be covered by another payer. Coordination of benefits needed.",
  "27": "Expenses incurred after coverage ended.",
  "29": "Filed past the timely filing window.",
  "31": "Patient cannot be identified as our insured. Verify Medicaid ID.",
  "96": "Non-covered charge. The payer says this service is not a benefit.",
  "97": "Already included in payment for another service.",
  "109": "Wrong payer. This claim belongs to another contractor or plan.",
  "119": "Benefit maximum reached. Check the visit limit for this episode.",
  "140": "Patient and insured identifiers do not match.",
  "197": "Authorization or precertification missing.",
  "198": "Authorization exceeded.",
  "204": "Service not covered under this plan.",
  "B7": "Provider not certified or eligible for this service on this date. Check enrollment.",
  "B15": "Required qualifying service not received or not on the claim.",
};

export function explainCarc(code: string): string {
  return CARC[code] ?? "Unmapped reason code. Look it up in the X12 CARC list and add it to the dictionary.";
}
