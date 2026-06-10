import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// A doula creates a link to send to a mother. The token is the credential
// for the public intake page; it is single-use.
export async function POST() {
  const user = await getApiUser("DOULA");
  if (!user) return jsonError("Sign in required", 401);

  const link = await prisma.intakeLink.create({
    data: { token: randomBytes(24).toString("hex"), doulaId: user.doulaId! },
  });
  await audit({
    actorType: "DOULA",
    actorId: user.id,
    action: "CREATE",
    entityType: "IntakeLink",
    entityId: link.id,
  });
  return NextResponse.json({ token: link.token, path: `/intake/${link.token}` }, { status: 201 });
}
