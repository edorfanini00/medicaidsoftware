import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError, jsonError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { markPayoutPaid } from "@/lib/billing/payouts";

const body = z.object({ railRef: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getApiUser("ADMIN"))) return jsonError("Admin access required", 403);
    const { id } = await params;
    const parsed = body.parse(await req.json());
    await markPayoutPaid(id, parsed.railRef);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
