import Link from "next/link";
import { Card, PageHeader, Table } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

const BOARD: Array<{ label: string; statuses: string[] }> = [
  { label: "Built", statuses: ["BUILT"] },
  { label: "Submitted", statuses: ["SUBMITTED", "ACCEPTED", "PENDING"] },
  { label: "Paid", statuses: ["PAID", "PARTIALLY_PAID"] },
  { label: "Needs work", statuses: ["REJECTED", "DENIED", "REWORKING"] },
];

export default async function Dashboard() {
  const [claimGroups, paidAgg, owedAgg, doulaCount, clientCount, recent] =
    await Promise.all([
      prisma.claim.groupBy({ by: ["status"], _count: true }),
      prisma.claim.aggregate({ _sum: { totalPaidCents: true } }),
      prisma.payout.aggregate({
        where: { status: "PENDING" },
        _sum: { netCents: true },
      }),
      prisma.doula.count(),
      prisma.client.count(),
      prisma.claim.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: { episode: { include: { client: true } }, payer: true },
      }),
    ]);

  const countFor = (statuses: string[]) =>
    claimGroups
      .filter((g) => statuses.includes(g.status))
      .reduce((acc, g) => acc + g._count, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Claim pipeline and money at a glance"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {BOARD.map((col) => (
          <Card key={col.label}>
            <p className="text-sm text-slate-500">{col.label}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              {countFor(col.statuses)}
            </p>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Collected from payers</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">
            {formatCents(paidAgg._sum.totalPaidCents ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Owed to doulas</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCents(owedAgg._sum.netCents ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Doulas</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{doulaCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Clients</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{clientCount}</p>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent claims</h2>
      <Table headers={["Claim", "Client", "Payer", "Charge", "Paid", "Status"]}>
        {recent.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5">
              <Link href={`/claims/${c.id}`} className="font-mono text-xs text-blue-700 hover:underline">
                {c.claimNumber}
              </Link>
            </td>
            <td className="px-4 py-2.5">
              {c.episode.client.firstName} {c.episode.client.lastName}
            </td>
            <td className="px-4 py-2.5 text-slate-600">{c.payer.name}</td>
            <td className="px-4 py-2.5">{formatCents(c.totalChargeCents)}</td>
            <td className="px-4 py-2.5">{formatCents(c.totalPaidCents)}</td>
            <td className="px-4 py-2.5">
              <StatusBadge status={c.status} />
            </td>
          </tr>
        ))}
        {recent.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
              No claims yet. Onboard a doula, add a client, log services, then build a claim.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
