import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError } from "@/lib/api";
import { buildClaim } from "@/lib/billing/claims";
import { prisma } from "@/lib/db";

const buildBody = z.object({
  episodeId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1),
});

export async function GET() {
  const claims = await prisma.claim.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      payer: true,
      renderingDoula: true,
      episode: { include: { client: true } },
      lines: true,
    },
  });
  return NextResponse.json(claims);
}

export async function POST(req: NextRequest) {
  try {
    const body = buildBody.parse(await req.json());
    const result = await buildClaim(body.episodeId, body.serviceIds);
    if (!result.ok) {
      return NextResponse.json({ error: "Validation failed", issues: result.issues }, { status: 422 });
    }
    return NextResponse.json({ claimId: result.claimId }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
