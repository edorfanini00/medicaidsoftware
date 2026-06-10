import { PageHeader, Table } from "@/components/PageHeader";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Append-only record of access and changes. Most recent 200 entries."
      />
      <Table headers={["When", "Actor", "Action", "Entity", "Detail"]}>
        {entries.map((e) => (
          <tr key={e.id} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
              {e.createdAt.toLocaleString()}
            </td>
            <td className="px-4 py-2 text-xs">
              {e.actorType}
              {e.actorId ? <span className="block font-mono text-[10px] text-slate-400">{e.actorId}</span> : null}
            </td>
            <td className="px-4 py-2 text-xs font-medium">{e.action}</td>
            <td className="px-4 py-2 text-xs">
              {e.entityType}
              <span className="block font-mono text-[10px] text-slate-400">{e.entityId}</span>
            </td>
            <td className="max-w-md truncate px-4 py-2 font-mono text-[11px] text-slate-500">
              {e.detail ? JSON.stringify(e.detail) : "-"}
            </td>
          </tr>
        ))}
        {entries.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No audit entries yet.</td>
          </tr>
        )}
      </Table>
    </div>
  );
}
