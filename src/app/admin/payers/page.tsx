import { Card, PageHeader, Table } from "@/components/PageHeader";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PayersPage() {
  const [payers, enrollments] = await Promise.all([
    prisma.payer.findMany({ orderBy: [{ state: "asc" }, { name: "asc" }] }),
    prisma.orgEnrollment.findMany({
      orderBy: { state: "asc" },
      include: { organization: true, payer: true },
    }),
  ]);
  const clearinghouse = process.env.CLEARINGHOUSE ?? "mock";

  return (
    <div>
      <PageHeader
        title="Payers and enrollment"
        subtitle="Who we bill, and where the organization is enrolled"
      />

      <Card title="Clearinghouse connection">
        <p className="text-sm text-slate-700">
          Active adapter: <span className="font-mono text-xs font-semibold">{clearinghouse}</span>
          {clearinghouse === "mock" && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Simulation only. No real claims leave this system.
            </span>
          )}
        </p>
      </Card>

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700">Payer directory</h2>
      <Table headers={["Payer", "State", "Type", "Payer ID", "Clearinghouse code"]}>
        {payers.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5 font-medium">{p.name}</td>
            <td className="px-4 py-2.5">{p.state}</td>
            <td className="px-4 py-2.5 text-slate-600">
              {p.payerType === "MEDICAID_FFS" ? "Medicaid FFS" : "Managed care"}
            </td>
            <td className="px-4 py-2.5 font-mono text-xs">{p.externalPayerId}</td>
            <td className="px-4 py-2.5 font-mono text-xs">{p.clearinghousePayerCode ?? "-"}</td>
          </tr>
        ))}
        {payers.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No payers configured.</td>
          </tr>
        )}
      </Table>

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700">Organization enrollments</h2>
      <Table headers={["Organization", "State", "Payer", "Medicaid provider ID", "Effective", "Status"]}>
        {enrollments.map((e) => (
          <tr key={e.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5 font-medium">{e.organization.name}</td>
            <td className="px-4 py-2.5">{e.state}</td>
            <td className="px-4 py-2.5 text-slate-600">{e.payer?.name ?? "All payers"}</td>
            <td className="px-4 py-2.5 font-mono text-xs">{e.medicaidProviderId}</td>
            <td className="px-4 py-2.5 text-slate-600">{e.effectiveDate.toLocaleDateString()}</td>
            <td className="px-4 py-2.5 text-slate-600">{e.status}</td>
          </tr>
        ))}
        {enrollments.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No enrollments recorded.</td>
          </tr>
        )}
      </Table>
    </div>
  );
}
