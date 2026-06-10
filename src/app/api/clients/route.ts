import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { handleRouteError } from "@/lib/api";
import { prisma } from "@/lib/db";

const createClient = z.object({
  doulaId: z.string().min(1),
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
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { doula: true, episodes: true },
  });
  return NextResponse.json(clients);
}

// Creates the client and opens their care episode in one step, since a client
// without a pregnancy episode has no billing meaning in this system.
export async function POST(req: NextRequest) {
  try {
    const body = createClient.parse(await req.json());
    const { expectedDeliveryDate, dob, ...rest } = body;

    const client = await prisma.client.create({
      data: {
        ...rest,
        dob: new Date(dob),
        episodes: {
          create: {
            doulaId: body.doulaId,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
          },
        },
      },
      include: { episodes: true },
    });
    await audit({
      actorType: "USER",
      action: "CREATE",
      entityType: "Client",
      entityId: client.id,
      detail: { state: client.state, planType: client.planType },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
