import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { Card, PageHeader } from "@/components/PageHeader";
import { ServicesPanel } from "@/components/ServicesPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      doula: true,
      payer: true,
      eligibilityChecks: { orderBy: { checkedAt: "desc" }, take: 5 },
      episodes: {
        orderBy: { createdAt: "desc" },
        include: {
          services: { orderBy: { serviceDate: "asc" } },
          claims: { orderBy: { createdAt: "desc" }, include: { payer: true } },
        },
      },
    },
  });
  if (!client) notFound();
  const episode = client.episodes[0];

  return (
    <div>
      <PageHeader
        title={`${client.firstName} ${client.lastName}`}
        subtitle={`Medicaid ${client.medicaidId} | ${client.state} | ${client.planType}${client.payer ? ` (${client.payer.name})` : ""} | Doula: ${client.doula.firstName} ${client.doula.lastName}`}
        actions={
          <ActionButton
            url="/api/eligibility"
            body={{ clientId: client.id }}
            label="Check eligibility"
            variant="secondary"
          />
        }
      />

      <div className="space-y-6">
        <Card title="Eligibility history (270/271)">
          {client.eligibilityChecks.length === 0 ? (
            <p className="text-sm text-slate-400">
              Never checked. Run a check before the first service.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {client.eligibilityChecks.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <StatusBadge status={e.status} />
                  <span className="text-slate-600">
                    checked {e.checkedAt.toLocaleString()} for service date{" "}
                    {e.serviceDate.toLocaleDateString()}
                    {e.payerName ? ` via ${e.payerName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {episode ? (
          <Card
            title={`Care episode (${episode.status}${episode.actualDeliveryDate ? `, delivered ${episode.actualDeliveryDate.toLocaleDateString()}` : episode.expectedDeliveryDate ? `, due ${episode.expectedDeliveryDate.toLocaleDateString()}` : ""})`}
          >
            <ServicesPanel
              episodeId={episode.id}
              services={episode.services.map((s) => ({
                id: s.id,
                serviceType: s.serviceType,
                serviceDate: s.serviceDate.toISOString(),
                procedureCode: s.procedureCode,
                modifier: s.modifier,
                units: s.units,
                chargeCents: s.chargeCents,
                status: s.status,
              }))}
            />
          </Card>
        ) : (
          <Card title="Care episode">
            <p className="text-sm text-slate-400">No episode on file.</p>
          </Card>
        )}

        {episode && episode.claims.length > 0 && (
          <Card title="Claims for this episode">
            <ul className="space-y-2 text-sm">
              {episode.claims.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <Link
                    href={`/claims/${c.id}`}
                    className="font-mono text-xs text-blue-700 hover:underline"
                  >
                    {c.claimNumber}
                  </Link>
                  <StatusBadge status={c.status} />
                  <span className="text-slate-600">
                    {formatCents(c.totalChargeCents)} charged, {formatCents(c.totalPaidCents)} paid, to {c.payer.name}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
