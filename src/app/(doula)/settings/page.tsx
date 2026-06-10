import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser("DOULA");
  const doula = await prisma.doula.findUniqueOrThrow({
    where: { id: user.doulaId! },
    include: { documents: true },
  });

  const row = "flex items-center justify-between px-5 py-3.5";

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Your profile, credentials, and payout details.</p>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-ink-soft">Profile</h2>
      <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
        <ul className="divide-y divide-hairline text-sm">
          <li className={row}>
            <span className="text-ink-soft">Name</span>
            <span className="font-medium">{doula.firstName} {doula.lastName}</span>
          </li>
          <li className={row}>
            <span className="text-ink-soft">Email</span>
            <span className="font-medium">{doula.email}</span>
          </li>
          <li className={row}>
            <span className="text-ink-soft">State</span>
            <span className="font-medium">{doula.state}</span>
          </li>
          <li className={row}>
            <span className="text-ink-soft">Provider number (NPI)</span>
            <span className="tnum font-medium">{doula.npi}</span>
          </li>
        </ul>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-ink-soft">Payouts</h2>
      <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
        <ul className="divide-y divide-hairline text-sm">
          <li className={row}>
            <span className="text-ink-soft">Payout method</span>
            <span className="font-medium">{doula.payoutMethod ?? "Not set up yet"}</span>
          </li>
          <li className={row}>
            <span className="text-ink-soft">Our fee</span>
            <span className="font-medium">{(doula.feeBps / 100).toFixed(1)}% of what Medicaid pays</span>
          </li>
        </ul>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        To change your payout account, contact us and we&apos;ll verify it&apos;s really you first.
      </p>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-ink-soft">Credentials on file</h2>
      <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
        <ul className="divide-y divide-hairline text-sm">
          {doula.documents.map((d) => (
            <li key={d.id} className={row}>
              <span className="text-ink-soft">{d.kind.replaceAll("_", " ").toLowerCase()}</span>
              <span className="font-medium">{d.fileName}</span>
            </li>
          ))}
          {doula.documents.length === 0 && (
            <li className="px-5 py-6 text-center text-ink-faint">
              No documents on file yet. We&apos;ll ask for what we need during onboarding.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
