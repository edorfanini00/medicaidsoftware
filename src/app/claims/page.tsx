import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { PageHeader, Table } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const claims = await prisma.claim.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      payer: true,
      renderingDoula: true,
      episode: { include: { client: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Claims"
        subtitle="Every claim, from build to remittance"
        actions={
          <ActionButton
            url="/api/remittances/poll"
            label="Pull remittances (835)"
            variant="secondary"
          />
        }
      />
      <Table headers={["Claim", "Client", "Doula", "Payer", "Charge", "Paid", "Status", "Submitted"]}>
        {claims.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5">
              <Link href={`/claims/${c.id}`} className="font-mono text-xs text-blue-700 hover:underline">
                {c.claimNumber}
              </Link>
            </td>
            <td className="px-4 py-2.5">
              {c.episode.client.firstName} {c.episode.client.lastName}
            </td>
            <td className="px-4 py-2.5 text-slate-600">
              {c.renderingDoula.firstName} {c.renderingDoula.lastName}
            </td>
            <td className="px-4 py-2.5 text-slate-600">{c.payer.name}</td>
            <td className="px-4 py-2.5">{formatCents(c.totalChargeCents)}</td>
            <td className="px-4 py-2.5">{formatCents(c.totalPaidCents)}</td>
            <td className="px-4 py-2.5">
              <StatusBadge status={c.status} />
            </td>
            <td className="px-4 py-2.5 text-slate-600">
              {c.submittedAt ? c.submittedAt.toLocaleDateString() : "-"}
            </td>
          </tr>
        ))}
        {claims.length === 0 && (
          <tr>
            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
              No claims yet.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
