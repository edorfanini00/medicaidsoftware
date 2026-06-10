import { EntityForm } from "@/components/EntityForm";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const [doulas, payers] = await Promise.all([
    prisma.doula.findMany({ orderBy: { lastName: "asc" } }),
    prisma.payer.findMany({ where: { payerType: "MCO" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Add client"
        subtitle="Creates the client and opens their care episode"
      />
      <EntityForm
        postUrl="/api/clients"
        redirectTo="/clients"
        submitLabel="Create client"
        fields={[
          {
            name: "doulaId",
            label: "Doula",
            type: "select",
            required: true,
            options: doulas.map((d) => ({
              value: d.id,
              label: `${d.firstName} ${d.lastName} (${d.state})`,
            })),
          },
          { name: "firstName", label: "First name", required: true },
          { name: "lastName", label: "Last name", required: true },
          { name: "dob", label: "Date of birth", type: "date", required: true },
          { name: "medicaidId", label: "Medicaid ID", required: true },
          { name: "state", label: "State (2 letters)", required: true, placeholder: "MN" },
          {
            name: "planType",
            label: "Plan type",
            type: "select",
            required: true,
            options: [
              { value: "FFS", label: "Fee for service" },
              { value: "MCO", label: "Managed care (MCO)" },
            ],
          },
          {
            name: "payerId",
            label: "MCO (only when plan type is MCO)",
            type: "select",
            options: payers.map((p) => ({ value: p.id, label: `${p.name} (${p.state})` })),
          },
          { name: "expectedDeliveryDate", label: "Expected delivery date", type: "date" },
          { name: "phone", label: "Phone" },
        ]}
      />
    </div>
  );
}
