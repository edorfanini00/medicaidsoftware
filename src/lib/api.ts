import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError(err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422);
  }
  console.error(err);
  return jsonError("Internal error", 500);
}
