import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api";
import { generatePayouts } from "@/lib/billing/payouts";
import { prisma } from "@/lib/db";

export async function GET() {
  const payouts = await prisma.payout.findMany({
    orderBy: { createdAt: "desc" },
    include: { doula: true, lines: true },
  });
  return NextResponse.json(payouts);
}

// Generates pending payouts from paid claim lines not yet paid out.
export async function POST() {
  try {
    const result = await generatePayouts();
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
