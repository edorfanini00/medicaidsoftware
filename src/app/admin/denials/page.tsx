import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { Card, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { explainCarc } from "@/lib/carc";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function DenialsPage() {
  const claims = await prisma.claim.findMany({
    where: { status: { in: ["DENIED", "REJECTED", "REWORKING", "PARTIALLY_PAID"] } },
    orderBy: { updatedAt: "desc" },
    include: {
      payer: true,
      renderingDoula: true,
      episode: { include: { client: true } },
      lines: true,
      events: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div>
      <PageHeader
        title="Denials and rework"
        subtitle="Adjudicated denials, front-end rejections, and partial payments that need attention"
      />
      <div className="space-y-4">
        {claims.map((c) => {
          const denialCodes = [...new Set(c.lines.flatMap((l) => l.denialCodes))];
          return (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/claims/${c.id}`}
                      className="font-mono text-xs text-blue-700 hover:underline"
                    >
                      {c.claimNumber}
                    </Link>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {c.episode.client.firstName} {c.episode.client.lastName} | {c.renderingDoula.firstName}{" "}
                    {c.renderingDoula.lastName} | {c.payer.name} | charged {formatCents(c.totalChargeCents)},
                    paid {formatCents(c.totalPaidCents)}
                  </p>
                  {c.status === "REJECTED" && c.events[0]?.message && (
                    <p className="mt-2 text-sm text-rose-700">
                      Rejection: {c.events[0].message}
                    </p>
                  )}
                  {denialCodes.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {denialCodes.map((code) => (
                        <li key={code} className="text-sm">
                          <span className="font-mono text-xs font-semibold text-rose-700">CARC {code}</span>{" "}
                          <span className="text-slate-700">{explainCarc(code)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {c.status !== "REWORKING" ? (
                    <ActionButton
                      url={`/api/claims/${c.id}/rework`}
                      label="Move to rework"
                      variant="secondary"
                    />
                  ) : (
                    <ActionButton url={`/api/claims/${c.id}/submit`} label="Resubmit" />
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {claims.length === 0 && (
          <Card>
            <p className="py-6 text-center text-sm text-slate-400">
              Nothing in the queue. Denials and rejections land here automatically when remittances and
              acknowledgments come in.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
