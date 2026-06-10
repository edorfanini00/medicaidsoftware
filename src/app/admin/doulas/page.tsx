import Link from "next/link";
import { PageHeader, Table } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DoulasPage() {
  const doulas = await prisma.doula.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clients: true, claims: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Doulas"
        subtitle="Rendering providers operating under the organization"
        actions={
          <Link
            href="/admin/doulas/new"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add doula
          </Link>
        }
      />
      <Table headers={["Name", "NPI", "State", "Clients", "Claims", "Fee", "Status"]}>
        {doulas.map((d) => (
          <tr key={d.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5 font-medium">
              {d.firstName} {d.lastName}
              <span className="block text-xs text-slate-400">{d.email}</span>
            </td>
            <td className="px-4 py-2.5 font-mono text-xs">{d.npi}</td>
            <td className="px-4 py-2.5">{d.state}</td>
            <td className="px-4 py-2.5">{d._count.clients}</td>
            <td className="px-4 py-2.5">{d._count.claims}</td>
            <td className="px-4 py-2.5">{(d.feeBps / 100).toFixed(1)}%</td>
            <td className="px-4 py-2.5">
              <StatusBadge status={d.status} />
            </td>
          </tr>
        ))}
        {doulas.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
              No doulas yet.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
