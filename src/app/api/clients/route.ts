import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { handleRouteError, jsonError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { checkEligibility } from "@/lib/billing/eligibility";
import { prisma } from "@/lib/db";

const createClient = z.object({
  doulaId: z.string().optional(), // ignored for doula callers, required for admins
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  medicaidId: z.string().min(1),
  state: z.string().length(2),
  planType: z.enum(["FFS", "MCO"]).default("FFS"),
  payerId: z.string().optional(),
  phone: z.string().optional(),
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET() {
  const user = await getApiUser();
  if (!user) return jsonError("Sign in required", 401);
  const clients = await prisma.client.findMany({
    where: user.role === "DOULA" ? { doulaId: user.doulaId! } : undefined,
    orderBy: { createdAt: "desc" },
    include: { doula: true, episodes: true },
  });
  return NextResponse.json(clients);
}

// Creates the client and opens their care episode. Doula callers are scoped
// to themselves; the system runs the eligibility check behind the scenes so
// the doula gets a plain-language answer immediately.
export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError("Sign in required", 401);

    const body = createClient.parse(await req.json());
    const doulaId = user.role === "DOULA" ? user.doulaId! : body.doulaId;
    if (!doulaId) return jsonError("doulaId is required", 422);

    const { expectedDeliveryDate, dob, doulaId: _ignored, ...rest } = body;
    void _ignored;

    const client = await prisma.client.create({
      data: {
        ...rest,
        state: rest.state.toUpperCase(),
        doulaId,
        dob: new Date(dob),
        episodes: {
          create: {
            doulaId,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
          },
        },
      },
      include: { episodes: true },
    });
    await audit({
      actorType: user.role === "DOULA" ? "DOULA" : "USER",
      actorId: user.id,
      action: "CREATE",
      entityType: "Client",
      entityId: client.id,
      detail: { state: client.state, planType: client.planType },
    });

    // Eligibility behind the scenes. Failure here must not block intake.
    let eligibilityStatus: string | null = null;
    try {
      const result = await checkEligibility(client.id, new Date(), user.id);
      if (result.ok) eligibilityStatus = result.check.status;
    } catch {
      eligibilityStatus = null;
    }

    return NextResponse.json({ ...client, eligibilityStatus }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
