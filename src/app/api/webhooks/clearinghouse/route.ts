import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError, jsonError } from "@/lib/api";
import { applyRemittance } from "@/lib/billing/remittance";

const remitSchema = z.object({
  payerExternalId: z.string(),
  remitDate: z.string(),
  checkOrEftNumber: z.string(),
  claims: z.array(
    z.object({
      claimNumber: z.string(),
      payerClaimControlNumber: z.string(),
      lines: z.array(
        z.object({
          lineNumber: z.number().int(),
          paidCents: z.number().int(),
          allowedCents: z.number().int().optional(),
          adjustmentCents: z.number().int(),
          adjustmentGroupCode: z.string().optional(),
          reasonCodes: z.array(z.string()),
          remarkCodes: z.array(z.string()),
        })
      ),
    })
  ),
});

// Push-based remittance delivery. Idempotent via the payer check/EFT number,
// so clearinghouse webhook retries are safe.
//
// The shared-secret header is a placeholder. Replace with the chosen
// clearinghouse's real signature scheme (HMAC etc.) when wiring a vendor.
export async function POST(req: NextRequest) {
  const secret = process.env.CLEARINGHOUSE_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-webhook-secret") !== secret) {
    return jsonError("Unauthorized", 401);
  }
  try {
    const file = remitSchema.parse(await req.json());
    const result = await applyRemittance(file);
    if (!result.ok) return jsonError(result.error, 422);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
