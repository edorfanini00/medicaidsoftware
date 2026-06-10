import { Card, PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

function Bar({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-44 shrink-0 truncate text-slate-600">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
        <div className="h-full rounded bg-slate-700" style={{ width: `${width}%` }} />
      </div>
      <span className="tnum w-24 shrink-0 text-right font-medium">{display}</span>
    </div>
  );
}

export default async function ReportsPage() {
  const [claims, byPayer, byDoula] = await Promise.all([
    prisma.claim.findMany({ select: { status: true, totalChargeCents: true, totalPaidCents: true, submittedAt: true, updatedAt: true } }),
    prisma.claim.groupBy({
      by: ["payerId"],
      _sum: { totalPaidCents: true },
    }),
    prisma.claim.groupBy({
      by: ["renderingDoulaId"],
      _sum: { totalPaidCents: true, totalChargeCents: true },
      _count: true,
    }),
  ]);

  const payers = await prisma.payer.findMany();
  const doulas = await prisma.doula.findMany();
  const payerName = (id: string) => payers.find((p) => p.id === id)?.name ?? id;
  const doulaName = (id: string) => {
    const d = doulas.find((x) => x.id === id);
    return d ? `${d.firstName} ${d.lastName}` : id;
  };

  const adjudicated = claims.filter((c) =>
    ["PAID", "PARTIALLY_PAID", "DENIED"].includes(c.status)
  );
  const denied = claims.filter((c) => c.status === "DENIED");
  const totalCharged = claims.reduce((a, c) => a + c.totalChargeCents, 0);
  const totalPaid = claims.reduce((a, c) => a + c.totalPaidCents, 0);
  const collectionRate = totalCharged > 0 ? (totalPaid / totalCharged) * 100 : 0;
  const denialRate = adjudicated.length > 0 ? (denied.length / adjudicated.length) * 100 : 0;

  const paidWithDates = claims.filter(
    (c) => (c.status === "PAID" || c.status === "PARTIALLY_PAID") && c.submittedAt
  );
  const avgDays =
    paidWithDates.length > 0
      ? paidWithDates.reduce(
          (a, c) => a + (c.updatedAt.getTime() - c.submittedAt!.getTime()) / 86400000,
          0
        ) / paidWithDates.length
      : 0;

  const maxPayer = Math.max(...byPayer.map((p) => p._sum.totalPaidCents ?? 0), 1);
  const maxDoula = Math.max(...byDoula.map((d) => d._sum.totalPaidCents ?? 0), 1);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Collection performance across the portfolio" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Collection rate</p>
          <p className="tnum mt-1 text-2xl font-semibold">{collectionRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-400">paid vs charged</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Denial rate</p>
          <p className="tnum mt-1 text-2xl font-semibold">{denialRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-400">of adjudicated claims</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Avg days to payment</p>
          <p className="tnum mt-1 text-2xl font-semibold">{avgDays.toFixed(1)}</p>
          <p className="text-xs text-slate-400">submission to remit</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Collected to date</p>
          <p className="tnum mt-1 text-2xl font-semibold">{formatCents(totalPaid)}</p>
          <p className="text-xs text-slate-400">{claims.length} claims total</p>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Revenue by payer">
          <div className="space-y-2">
            {byPayer
              .sort((a, b) => (b._sum.totalPaidCents ?? 0) - (a._sum.totalPaidCents ?? 0))
              .map((p) => (
                <Bar
                  key={p.payerId}
                  label={payerName(p.payerId)}
                  value={p._sum.totalPaidCents ?? 0}
                  max={maxPayer}
                  display={formatCents(p._sum.totalPaidCents ?? 0)}
                />
              ))}
            {byPayer.length === 0 && <p className="text-sm text-slate-400">No claims yet.</p>}
          </div>
        </Card>

        <Card title="Production by doula (collected)">
          <div className="space-y-2">
            {byDoula
              .sort((a, b) => (b._sum.totalPaidCents ?? 0) - (a._sum.totalPaidCents ?? 0))
              .map((d) => (
                <Bar
                  key={d.renderingDoulaId}
                  label={doulaName(d.renderingDoulaId)}
                  value={d._sum.totalPaidCents ?? 0}
                  max={maxDoula}
                  display={formatCents(d._sum.totalPaidCents ?? 0)}
                />
              ))}
            {byDoula.length === 0 && <p className="text-sm text-slate-400">No claims yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
