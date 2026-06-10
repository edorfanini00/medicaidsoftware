import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api";
import { refreshClaimStatus } from "@/lib/billing/claims";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await refreshClaimStatus(id);
    if (!result.ok) return jsonError(result.error, 409);
    return NextResponse.json({ status: result.status });
  } catch (err) {
    return handleRouteError(err);
  }
}
