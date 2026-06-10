import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { submitClaim } from "@/lib/billing/claims";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getApiUser("ADMIN"))) return jsonError("Admin access required", 403);
    const { id } = await params;
    const result = await submitClaim(id);
    if (!result.ok) return jsonError(result.error, 409);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
