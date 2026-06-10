import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api";
import { applyRemittance } from "@/lib/billing/remittance";
import { getClearinghouse } from "@/lib/clearinghouse";

// Pull-based remittance ingestion for clearinghouses without webhooks, and
// the dev path for the mock adapter. In production this runs on a schedule
// from the job queue, not from a user click.
export async function POST() {
  try {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const files = await getClearinghouse().fetchRemittances(since);
    const results = [];
    for (const file of files) {
      results.push(await applyRemittance(file));
    }
    return NextResponse.json({ ingested: results.length, results });
  } catch (err) {
    return handleRouteError(err);
  }
}
