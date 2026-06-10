import { EntityForm } from "@/components/EntityForm";
import { PageHeader } from "@/components/PageHeader";

export default function NewDoulaPage() {
  return (
    <div>
      <PageHeader
        title="Add doula"
        subtitle="Creates a rendering provider under the organization"
      />
      <EntityForm
        postUrl="/api/doulas"
        redirectTo="/doulas"
        submitLabel="Create doula"
        fields={[
          { name: "firstName", label: "First name", required: true },
          { name: "lastName", label: "Last name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: "Phone" },
          { name: "npi", label: "NPI (Type 1, 10 digits)", required: true, placeholder: "1234567890" },
          {
            name: "taxonomyCode",
            label: "Taxonomy code",
            required: true,
            placeholder: "374J00000X (verify for the state)",
          },
          { name: "state", label: "State (2 letters)", required: true, placeholder: "MN" },
        ]}
      />
    </div>
  );
}
