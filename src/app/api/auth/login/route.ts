import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { handleRouteError, jsonError } from "@/lib/api";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { email, password } = body.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Same response for unknown email and wrong password.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return jsonError("That email and password combination does not match.", 401);
    }
    const token = await createSession(user.id);
    await setSessionCookie(token);
    await audit({
      actorType: "USER",
      actorId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
    });
    return NextResponse.json({ role: user.role });
  } catch (err) {
    return handleRouteError(err);
  }
}
