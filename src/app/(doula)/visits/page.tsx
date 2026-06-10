import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VISIT_LABEL } from "@/lib/plain";

export const dynamic = "force-dynamic";

const STATUS_PLAIN: Record<string, { label: string; cls: string }> = {
  LOGGED: { label: "Recorded", cls: "bg-paper text-ink-soft" },
  VALIDATED: { label: "Recorded", cls: "bg-paper text-ink-soft" },
  CLAIMED: { label: "On its way", cls: "bg-amber-soft text-amber-warm" },
  PAID: { label: "Paid", cls: "bg-money-soft text-money" },
  DENIED: { label: "We're handling it", cls: "bg-clay-soft text-clay" },
};

export default async function VisitsPage() {
  const user = await requireUser("DOULA");
  const services = await prisma.service.findMany({
    where: { doulaId: user.doulaId! },
    orderBy: { serviceDate: "desc" },
    include: { episode: { include: { client: true } } },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Visits</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Everything you&apos;ve logged, newest first.</p>
        </div>
        <Link
          href="/visits/new"
          className="rounded-full bg-aubergine px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-mid"
        >
          + Log a visit
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
        <ul className="divide-y divide-hairline">
          {services.map((s) => {
            const plain = STATUS_PLAIN[s.status] ?? STATUS_PLAIN.LOGGED;
            return (
              <li key={s.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium">
                    {VISIT_LABEL[s.serviceType]}{" "}
                    <span className="text-ink-faint">
                      with {s.episode.client.firstName} {s.episode.client.lastName.charAt(0)}.
                    </span>
                  </p>
                  <p className="text-xs text-ink-faint">
                    {s.serviceDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${plain.cls}`}>
                  {plain.label}
                </span>
              </li>
            );
          })}
          {services.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-ink-faint">
              No visits logged yet.{" "}
              <Link href="/visits/new" className="text-violet-mid hover:underline">
                Log your first one
              </Link>
              .
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
