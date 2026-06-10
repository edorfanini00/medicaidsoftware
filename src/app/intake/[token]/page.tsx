import { prisma } from "@/lib/db";
import { IntakeFlow } from "@/components/IntakeFlow";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await prisma.intakeLink.findUnique({
    where: { token },
    include: { doula: true },
  });

  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-12">
      <div className="w-full max-w-md fade-in">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay font-display text-lg font-semibold text-white">
            m
          </span>
          <span className="font-display text-lg font-semibold">Maren</span>
        </div>
        <div className="rounded-2xl border border-hairline bg-card p-6 shadow-sm sm:p-8">
          {link && link.status === "PENDING" ? (
            <IntakeFlow
              token={token}
              doulaName={`${link.doula.firstName} ${link.doula.lastName}`}
            />
          ) : (
            <div className="text-center">
              <h1 className="font-display text-xl font-semibold">This link has expired</h1>
              <p className="mt-2 text-sm text-ink-soft">
                Ask your doula to send you a fresh one. It only takes a moment.
              </p>
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-ink-faint">
          Your information is encrypted and used only for your Medicaid doula benefit.
        </p>
      </div>
    </div>
  );
}
