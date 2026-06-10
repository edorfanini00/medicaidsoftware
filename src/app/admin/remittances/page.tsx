import { ActionButton } from "@/components/ActionButton";
import { PageHeader, Table } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function RemittancesPage() {
  const remits = await prisma.remittanceAdvice.findMany({
    orderBy: { remitDate: "desc" },
    include: { payer: true, lines: { include: { claim: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Remittances"
        subtitle="Ingested 835s, posted against claim lines"
        actions={<ActionButton url="/api/remittances/poll" label="Pull new remittances" variant="secondary" />}
      />
      <Table headers={["Check / EFT", "Payer", "Remit date", "Claims", "Total paid", "Reconciled"]}>
        {remits.map((r) => {
          const claimCount = new Set(r.lines.map((l) => l.claimId)).size;
          return (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 font-mono text-xs">{r.checkOrEftNumber}</td>
              <td className="px-4 py-2.5">{r.payer.name}</td>
              <td className="px-4 py-2.5 text-slate-600">{r.remitDate.toLocaleDateString()}</td>
              <td className="px-4 py-2.5">{claimCount}</td>
              <td className="px-4 py-2.5 tnum">{formatCents(r.totalPaidCents)}</td>
              <td className="px-4 py-2.5">
                {r.reconciledAt ? (
                  <span className="text-sm text-emerald-700">
                    {r.reconciledAt.toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-sm text-amber-700">Outstanding</span>
                )}
              </td>
            </tr>
          );
        })}
        {remits.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
              No remittances ingested yet.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
