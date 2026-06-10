import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { generatePayouts } from "@/lib/billing/payouts";
import { prisma } from "@/lib/db";

export async function GET() {
  if (!(await getApiUser("ADMIN"))) return jsonError("Admin access required", 403);
  const payouts = await prisma.payout.findMany({
    orderBy: { createdAt: "desc" },
    include: { doula: true, lines: true },
  });
  return NextResponse.json(payouts);
}

// Generates pending payouts from paid claim lines not yet paid out.
export async function POST() {
  try {
    const user = await getApiUser("ADMIN");
    if (!user) return jsonError("Admin access required", 403);
    const result = await generatePayouts(user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
