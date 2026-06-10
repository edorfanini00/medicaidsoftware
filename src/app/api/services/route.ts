import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { handleRouteError, jsonError } from "@/lib/api";
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
    const body = createService.parse(await req.json());
    const episode = await prisma.careEpisode.findUnique({ where: { id: body.episodeId } });
    if (!episode) return jsonError("Episode not found", 404);
    if (episode.status !== "ACTIVE") return jsonError("Episode is not active", 409);

    const updates =
      body.serviceType === "LABOR_DELIVERY" && !episode.actualDeliveryDate
        ? { actualDeliveryDate: new Date(body.serviceDate) }
        : undefined;
    if (updates) {
      await prisma.careEpisode.update({ where: { id: episode.id }, data: updates });
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
      actorType: "DOULA",
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
