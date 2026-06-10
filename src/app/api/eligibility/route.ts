import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError, jsonError } from "@/lib/api";
import { checkEligibility } from "@/lib/billing/eligibility";

const body = z.object({
  clientId: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = body.parse(await req.json());
    const result = await checkEligibility(
      parsed.clientId,
      parsed.serviceDate ? new Date(parsed.serviceDate) : new Date()
    );
    if (!result.ok) return jsonError(result.error, 409);
    return NextResponse.json(result.check, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
