import { Card, PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function RulesetsPage() {
  const rulesets = await prisma.stateRuleset.findMany({
    orderBy: [{ state: "asc" }, { version: "desc" }],
    include: { codeRules: true, defaultPayer: true },
  });

  return (
    <div>
      <PageHeader
        title="State rules"
        subtitle="Per-state billing configuration. Adding a state is authoring one of these, not writing code."
      />
      <div className="space-y-6">
        {rulesets.map((rs) => (
          <Card
            key={rs.id}
            title={`${rs.state} v${rs.version} ${rs.active ? "(active)" : "(inactive)"} | effective ${rs.effectiveDate.toLocaleDateString()}`}
          >
            <div className="mb-3 text-sm text-slate-600">
              Default POS {rs.defaultPlaceOfService} | default diagnosis{" "}
              {rs.defaultDiagnosisCodes.join(", ") || "none"} | default payer{" "}
              {rs.defaultPayer?.name ?? "none"}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-4 font-medium">Service</th>
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 pr-4 font-medium">Modifier</th>
                  <th className="py-2 pr-4 font-medium">Units/visit</th>
                  <th className="py-2 pr-4 font-medium">Rate</th>
                  <th className="py-2 font-medium">Max visits/episode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rs.codeRules.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4">{r.serviceType.replaceAll("_", " ")}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.procedureCode}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.modifier ?? "-"}</td>
                    <td className="py-2 pr-4">{r.unitsPerVisit}</td>
                    <td className="py-2 pr-4">{formatCents(r.rateCents)}</td>
                    <td className="py-2">{r.maxVisitsPerEpisode ?? "unlimited"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rs.notes && <p className="mt-3 text-xs text-slate-500">{rs.notes}</p>}
          </Card>
        ))}
        {rulesets.length === 0 && (
          <p className="text-sm text-slate-400">
            No rulesets yet. Seed the database or author one for the launch state.
          </p>
        )}
      </div>
    </div>
  );
}
