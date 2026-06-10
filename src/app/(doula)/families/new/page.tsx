import { requireUser } from "@/lib/auth";
import { AddFamilyForm } from "@/components/AddFamilyForm";
import { InviteLinkButton } from "@/components/InviteLinkButton";

export const dynamic = "force-dynamic";

export default async function NewFamilyPage() {
  await requireUser("DOULA");
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Add a family</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          A few basics about the mother. We&apos;ll confirm her Medicaid coverage right away
          and handle all the billing behind the scenes.
        </p>
      </div>
      <AddFamilyForm />
      <div className="mt-4">
        <InviteLinkButton />
      </div>
    </div>
  );
}
