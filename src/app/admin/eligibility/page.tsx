import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { PageHeader, Table } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EligibilityConsolePage() {
  const checks = await prisma.eligibilityCheck.findMany({
    orderBy: { checkedAt: "desc" },
    take: 100,
    include: { client: { include: { doula: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Eligibility console"
        subtitle="270/271 checks across all clients, newest first"
      />
      <Table headers={["Client", "Doula", "Checked", "Service date", "Payer", "Result", ""]}>
        {checks.map((e) => (
          <tr key={e.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5">
              <Link href={`/admin/clients/${e.clientId}`} className="font-medium text-blue-700 hover:underline">
                {e.client.firstName} {e.client.lastName}
              </Link>
            </td>
            <td className="px-4 py-2.5 text-slate-600">
              {e.client.doula.firstName} {e.client.doula.lastName}
            </td>
            <td className="px-4 py-2.5 text-slate-600">{e.checkedAt.toLocaleString()}</td>
            <td className="px-4 py-2.5 text-slate-600">{e.serviceDate.toLocaleDateString()}</td>
            <td className="px-4 py-2.5 text-slate-600">{e.payerName ?? "-"}</td>
            <td className="px-4 py-2.5">
              <StatusBadge status={e.status} />
            </td>
            <td className="px-4 py-2.5">
              <ActionButton
                url="/api/eligibility"
                body={{ clientId: e.clientId }}
                label="Re-run"
                variant="secondary"
              />
            </td>
          </tr>
        ))}
        {checks.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
              No eligibility checks yet. They run automatically at client intake.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
