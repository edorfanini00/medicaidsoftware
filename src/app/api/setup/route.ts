import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { seedDemo } from "@/lib/seed-demo";

// First-run bootstrap: loads the demo dataset into an empty database.
// Refuses to run once any user exists, so it cannot wipe a live system.
// Remove this route before real client data enters the product.
export async function POST() {
  const users = await prisma.user.count();
  if (users > 0) {
    return jsonError("Already set up. This endpoint only works on an empty database.", 409);
  }
  await seedDemo(prisma);
  return NextResponse.json({
    ok: true,
    accounts: ["jamie@example.com (doula)", "admin@example.com (admin)"],
    password: "maren-demo",
  });
}
