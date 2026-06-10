import { ActionButton } from "@/components/ActionButton";
import { Card, PageHeader, Table } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const remits = await prisma.remittanceAdvice.findMany({
    orderBy: { remitDate: "desc" },
    include: { payer: true },
  });
  const outstanding = remits.filter((r) => !r.reconciledAt);
  const reconciled = remits.filter((r) => r.reconciledAt);
  const outstandingTotal = outstanding.reduce((a, r) => a + r.totalPaidCents, 0);
  const reconciledTotal = reconciled.reduce((a, r) => a + r.totalPaidCents, 0);

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        subtitle="Match payer remittances to bank deposits by check or EFT number"
      />
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Outstanding (remit received, deposit unmatched)</p>
          <p className="tnum mt-1 text-2xl font-semibold text-amber-700">{formatCents(outstandingTotal)}</p>
          <p className="text-xs text-slate-400">{outstanding.length} remittances</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Reconciled</p>
          <p className="tnum mt-1 text-2xl font-semibold text-emerald-700">{formatCents(reconciledTotal)}</p>
          <p className="text-xs text-slate-400">{reconciled.length} remittances</p>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Awaiting deposit match</h2>
      <Table headers={["Check / EFT", "Payer", "Remit date", "Amount", ""]}>
        {outstanding.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5 font-mono text-xs">{r.checkOrEftNumber}</td>
            <td className="px-4 py-2.5">{r.payer.name}</td>
            <td className="px-4 py-2.5 text-slate-600">{r.remitDate.toLocaleDateString()}</td>
            <td className="px-4 py-2.5 tnum">{formatCents(r.totalPaidCents)}</td>
            <td className="px-4 py-2.5">
              <ActionButton
                url={`/api/remittances/${r.id}/reconcile`}
                label="Match to deposit"
                variant="secondary"
              />
            </td>
          </tr>
        ))}
        {outstanding.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
              Nothing outstanding. Every remittance is matched to a deposit.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
