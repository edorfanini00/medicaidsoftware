import { ActionButton } from "@/components/ActionButton";
import { PageHeader, Table } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const payouts = await prisma.payout.findMany({
    orderBy: { createdAt: "desc" },
    include: { doula: true, lines: true },
  });

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle="Doula share of paid claims, minus the company fee"
        actions={
          <ActionButton url="/api/payouts" label="Generate payouts from paid claims" />
        }
      />
      <Table headers={["Doula", "Lines", "Gross", "Fee", "Net", "Status", "Created", ""]}>
        {payouts.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5 font-medium">
              {p.doula.firstName} {p.doula.lastName}
            </td>
            <td className="px-4 py-2.5">{p.lines.length}</td>
            <td className="px-4 py-2.5">{formatCents(p.grossCents)}</td>
            <td className="px-4 py-2.5 text-slate-600">{formatCents(p.feeCents)}</td>
            <td className="px-4 py-2.5 font-medium">{formatCents(p.netCents)}</td>
            <td className="px-4 py-2.5">
              <StatusBadge status={p.status} />
            </td>
            <td className="px-4 py-2.5 text-slate-600">{p.createdAt.toLocaleDateString()}</td>
            <td className="px-4 py-2.5">
              {p.status === "PENDING" && (
                <ActionButton
                  url={`/api/payouts/${p.id}/mark-paid`}
                  body={{ railRef: `MANUAL-${Date.now()}` }}
                  label="Mark paid"
                  variant="secondary"
                />
              )}
            </td>
          </tr>
        ))}
        {payouts.length === 0 && (
          <tr>
            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
              No payouts yet. Payouts are generated from paid claim lines.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
