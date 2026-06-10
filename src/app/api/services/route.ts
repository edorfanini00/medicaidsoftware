import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { handleRouteError, jsonError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createService = z.object({
  episodeId: z.string().min(1),
  serviceType: z.enum(["PRENATAL", "LABOR_DELIVERY", "POSTPARTUM"]),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

// A doula logs a visit or the delivery. Codes, units, and charges are stamped
// later at claim build, from the active StateRuleset.
export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError("Sign in required", 401);

    const body = createService.parse(await req.json());
    const episode = await prisma.careEpisode.findUnique({ where: { id: body.episodeId } });
    if (!episode) return jsonError("Episode not found", 404);
    // Doulas can only log visits for their own families.
    if (user.role === "DOULA" && episode.doulaId !== user.doulaId) {
      return jsonError("Not your family", 403);
    }
    if (episode.status !== "ACTIVE") return jsonError("This care episode is closed", 409);

    if (body.serviceType === "LABOR_DELIVERY" && !episode.actualDeliveryDate) {
      await prisma.careEpisode.update({
        where: { id: episode.id },
        data: { actualDeliveryDate: new Date(body.serviceDate) },
      });
    }

    const service = await prisma.service.create({
      data: {
        episodeId: body.episodeId,
        doulaId: episode.doulaId,
        serviceType: body.serviceType,
        serviceDate: new Date(body.serviceDate),
        notes: body.notes,
      },
    });
    await audit({
      actorType: user.role === "DOULA" ? "DOULA" : "USER",
      actorId: user.id,
      action: "CREATE",
      entityType: "Service",
      entityId: service.id,
      detail: { serviceType: body.serviceType, serviceDate: body.serviceDate },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
