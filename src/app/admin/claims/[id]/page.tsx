import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { Card, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const claim = await prisma.claim.findUnique({
    where: { id },
    include: {
      organization: true,
      renderingDoula: true,
      payer: true,
      episode: { include: { client: true } },
      lines: { orderBy: { lineNumber: "asc" }, include: { service: true } },
      events: { orderBy: { createdAt: "asc" } },
      remittanceLines: { include: { remittance: true } },
    },
  });
  if (!claim) notFound();

  const canSubmit = claim.status === "BUILT" || claim.status === "REWORKING";

  return (
    <div>
      <PageHeader
        title={claim.claimNumber}
        subtitle={`${claim.episode.client.firstName} ${claim.episode.client.lastName} | rendered by ${claim.renderingDoula.firstName} ${claim.renderingDoula.lastName} | billed to ${claim.payer.name}`}
        actions={
          <>
            {canSubmit && (
              <ActionButton url={`/api/claims/${claim.id}/submit`} label="Submit to clearinghouse" />
            )}
            {claim.clearinghouseClaimId && (
              <ActionButton
                url={`/api/claims/${claim.id}/refresh-status`}
                label="Refresh status (277)"
                variant="secondary"
              />
            )}
          </>
        }
      />

      <div className="mb-6 flex items-center gap-4">
        <StatusBadge status={claim.status} />
        <span className="text-sm text-slate-600">
          Charged {formatCents(claim.totalChargeCents)}, paid {formatCents(claim.totalPaidCents)}
        </span>
        {claim.clearinghouseClaimId && (
          <span className="text-xs font-mono text-slate-400">
            CH: {claim.clearinghouseClaimId}
          </span>
        )}
        {claim.payerClaimControlNumber && (
          <span className="text-xs font-mono text-slate-400">
            ICN: {claim.payerClaimControlNumber}
          </span>
        )}
      </div>

      <div className="space-y-6">
        <Card title="Claim lines">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">Service date</th>
                <th className="py-2 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium">Units</th>
                <th className="py-2 pr-4 font-medium">Charge</th>
                <th className="py-2 pr-4 font-medium">Paid</th>
                <th className="py-2 pr-4 font-medium">Denial codes</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claim.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 pr-4">{l.lineNumber}</td>
                  <td className="py-2 pr-4">{l.service.serviceDate.toLocaleDateString()}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {l.procedureCode}
                    {l.modifier ? ` ${l.modifier}` : ""}
                  </td>
                  <td className="py-2 pr-4">{l.units}</td>
                  <td className="py-2 pr-4">{formatCents(l.chargeCents)}</td>
                  <td className="py-2 pr-4">{formatCents(l.paidCents)}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-rose-600">
                    {l.denialCodes.join(", ") || "-"}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {claim.remittanceLines.length > 0 && (
          <Card title="Remittance (835)">
            <ul className="space-y-1 text-sm text-slate-600">
              {claim.remittanceLines.map((r) => (
                <li key={r.id}>
                  {r.remittance.checkOrEftNumber} on{" "}
                  {r.remittance.remitDate.toLocaleDateString()}: paid {formatCents(r.paidCents)}
                  {r.adjustmentCents > 0 &&
                    `, adjusted ${formatCents(r.adjustmentCents)} (${r.adjustmentGroupCode ?? ""} ${r.reasonCodes.join(",")})`}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Event history">
          <ul className="space-y-2 text-sm">
            {claim.events.map((e) => (
              <li key={e.id} className="flex items-start gap-3">
                <span className="w-36 shrink-0 text-xs text-slate-400">
                  {e.createdAt.toLocaleString()}
                </span>
                <span className="w-24 shrink-0 text-xs font-medium text-slate-500">{e.source}</span>
                <span className="text-slate-700">
                  {e.fromStatus ? `${e.fromStatus} to ${e.toStatus}` : e.toStatus}
                  {e.message ? `: ${e.message}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
