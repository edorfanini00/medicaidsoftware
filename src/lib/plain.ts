import type { Claim, ClaimStatus } from "@prisma/client";

// The doula-facing translation layer. The promise of the product is that the
// doula never sees claim internals, so every status crossing into her surface
// passes through here. EDI language stops at this boundary.

export type MoneyBucket = "paid" | "onway" | "hold" | "building";

export function claimBucket(status: ClaimStatus): MoneyBucket {
  switch (status) {
    case "PAID":
    case "PARTIALLY_PAID":
      return "paid";
    case "SUBMITTED":
    case "ACCEPTED":
    case "PENDING":
      return "onway";
    case "REJECTED":
    case "DENIED":
    case "REWORKING":
      return "hold";
    default:
      return "building";
  }
}

export const BUCKET_LABEL: Record<MoneyBucket, string> = {
  paid: "Paid",
  onway: "On its way",
  hold: "We're handling it",
  building: "Getting ready",
};

// What the doula will take home from a claim, after the company fee.
export function doulaShare(cents: number, feeBps: number): number {
  return cents - Math.floor((cents * feeBps) / 10000);
}

// Summarize a set of claims into the three doula-facing money numbers.
// Paid uses actual payer-paid amounts; in-flight uses the charge as the
// estimate, which is what "on its way" honestly means before adjudication.
export function summarizeClaims(claims: Claim[], feeBps: number) {
  let paid = 0;
  let onway = 0;
  let hold = 0;
  let holdCount = 0;
  let onwayCount = 0;
  for (const claim of claims) {
    const bucket = claimBucket(claim.status);
    if (bucket === "paid") paid += doulaShare(claim.totalPaidCents, feeBps);
    else if (bucket === "onway") {
      onway += doulaShare(claim.totalChargeCents, feeBps);
      onwayCount += 1;
    } else if (bucket === "hold") {
      hold += doulaShare(claim.totalChargeCents, feeBps);
      holdCount += 1;
    }
  }
  return { paid, onway, hold, holdCount, onwayCount };
}

// The family card badge: the most urgent claim state wins, but framed from
// the doula's side. A hold is "we're handling it", never "denied".
export function familyBadge(claims: Claim[]): { label: string; bucket: MoneyBucket } | null {
  if (claims.length === 0) return null;
  const buckets = claims.map((c) => claimBucket(c.status));
  if (buckets.includes("hold")) return { label: "We're handling it", bucket: "hold" };
  if (buckets.includes("onway")) return { label: "On its way", bucket: "onway" };
  if (buckets.includes("paid")) return { label: "Paid", bucket: "paid" };
  return { label: "Getting ready", bucket: "building" };
}

export const VISIT_LABEL: Record<string, string> = {
  PRENATAL: "Prenatal visit",
  LABOR_DELIVERY: "Birth support",
  POSTPARTUM: "Postpartum visit",
};

export function monthName(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long" });
}

export function weeksAlong(expectedDeliveryDate: Date | null): number | null {
  if (!expectedDeliveryDate) return null;
  const msToGo = expectedDeliveryDate.getTime() - Date.now();
  const weeksToGo = msToGo / (1000 * 60 * 60 * 24 * 7);
  const weeks = Math.round(40 - weeksToGo);
  return weeks > 0 && weeks <= 42 ? weeks : null;
}
