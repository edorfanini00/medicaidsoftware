import Link from "next/link";
import { PageHeader, Table } from "@/components/PageHeader";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      doula: true,
      eligibilityChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
    },
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Mothers receiving doula care under Medicaid"
        actions={
          <Link
            href="/clients/new"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add client
          </Link>
        }
      />
      <Table headers={["Name", "Medicaid ID", "State", "Plan", "Doula", "Last eligibility"]}>
        {clients.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5">
              <Link href={`/clients/${c.id}`} className="font-medium text-blue-700 hover:underline">
                {c.firstName} {c.lastName}
              </Link>
            </td>
            <td className="px-4 py-2.5 font-mono text-xs">{c.medicaidId}</td>
            <td className="px-4 py-2.5">{c.state}</td>
            <td className="px-4 py-2.5">{c.planType}</td>
            <td className="px-4 py-2.5 text-slate-600">
              {c.doula.firstName} {c.doula.lastName}
            </td>
            <td className="px-4 py-2.5 text-slate-600">
              {c.eligibilityChecks[0]
                ? `${c.eligibilityChecks[0].status} (${c.eligibilityChecks[0].checkedAt.toLocaleDateString()})`
                : "Never checked"}
            </td>
          </tr>
        ))}
        {clients.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
              No clients yet.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
