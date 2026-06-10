import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { handleRouteError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

const createDoula = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits"),
  taxonomyCode: z.string().min(1),
  state: z.string().length(2),
  feeBps: z.number().int().min(0).max(10000).optional(),
});

export async function GET() {
  const doulas = await prisma.doula.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clients: true, claims: true } } },
  });
  return NextResponse.json(doulas);
}

export async function POST(req: NextRequest) {
  try {
    const body = createDoula.parse(await req.json());
    const org = await prisma.organization.findFirst();
    if (!org) return jsonError("No organization configured. Seed or create one first.", 409);

    const doula = await prisma.doula.create({
      data: { ...body, organizationId: org.id },
    });
    await audit({
      actorType: "USER",
      action: "CREATE",
      entityType: "Doula",
      entityId: doula.id,
      detail: { npi: doula.npi, state: doula.state },
    });
    return NextResponse.json(doula, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
