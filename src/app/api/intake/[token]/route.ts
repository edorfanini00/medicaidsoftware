import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { handleRouteError, jsonError } from "@/lib/api";
import { checkEligibility } from "@/lib/billing/eligibility";
import { prisma } from "@/lib/db";

const intakeBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().optional(),
  medicaidId: z.string().min(1),
  state: z.string().length(2),
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  consentName: z.string().min(2),
  consentText: z.string().min(10),
});

// Public endpoint: the single-use intake token is the credential.
// Creates the client under the inviting doula, records the billing consent,
// and runs the coverage check, all in plain language back to the mother.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const link = await prisma.intakeLink.findUnique({
      where: { token },
      include: { doula: true },
    });
    if (!link || link.status !== "PENDING") {
      return jsonError("This link is no longer valid. Ask your doula for a new one.", 410);
    }

    const body = intakeBody.parse(await req.json());

    const client = await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          doulaId: link.doulaId,
          firstName: body.firstName,
          lastName: body.lastName,
          dob: new Date(body.dob),
          phone: body.phone,
          medicaidId: body.medicaidId,
          state: body.state.toUpperCase(),
          episodes: {
            create: {
              doulaId: link.doulaId,
              expectedDeliveryDate: body.expectedDeliveryDate
                ? new Date(body.expectedDeliveryDate)
                : undefined,
            },
          },
        },
      });
      await tx.consentRecord.create({
        data: {
          clientId: created.id,
          kind: "BILLING_AUTHORIZATION",
          signedName: body.consentName,
          consentText: body.consentText,
        },
      });
      await tx.intakeLink.update({
        where: { id: link.id },
        data: { status: "COMPLETED", clientId: created.id },
      });
      return created;
    });

    await audit({
      actorType: "WEBHOOK",
      action: "INTAKE_COMPLETE",
      entityType: "Client",
      entityId: client.id,
      detail: { intakeLinkId: link.id },
    });

    let eligibilityStatus: string | null = null;
    try {
      const result = await checkEligibility(client.id, new Date());
      if (result.ok) eligibilityStatus = result.check.status;
    } catch {
      eligibilityStatus = null;
    }

    return NextResponse.json(
      { ok: true, doulaName: `${link.doula.firstName} ${link.doula.lastName}`, eligibilityStatus },
      { status: 201 }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
