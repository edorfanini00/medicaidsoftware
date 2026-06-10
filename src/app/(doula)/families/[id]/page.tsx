import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { BUCKET_LABEL, claimBucket, doulaShare, summarizeClaims, VISIT_LABEL } from "@/lib/plain";
import { buildFamilyView } from "@/lib/families";
import { getActiveRuleset, getCodeRule } from "@/lib/rulesets";
import { JourneyArc } from "@/components/JourneyArc";

export const dynamic = "force-dynamic";

const SERVICE_PLAIN: Record<string, { label: string; cls: string }> = {
  LOGGED: { label: "Recorded", cls: "bg-paper text-ink-soft" },
  VALIDATED: { label: "Recorded", cls: "bg-paper text-ink-soft" },
  CLAIMED: { label: "On its way", cls: "bg-amber-soft text-amber-warm" },
  PAID: { label: "Paid", cls: "bg-money-soft text-money" },
  DENIED: { label: "We're handling it", cls: "bg-clay-soft text-clay" },
};

export default async function FamilyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("DOULA");
  const { id } = await params;

  // Scoped lookup: a doula can only ever load her own client.
  const client = await prisma.client.findFirst({
    where: { id, doulaId: user.doulaId! },
    include: {
      eligibilityChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
      episodes: {
        orderBy: { createdAt: "desc" },
        include: { client: true, services: { orderBy: { serviceDate: "desc" } }, claims: true },
      },
    },
  });
  if (!client) notFound();
  const episode = client.episodes[0];
  if (!episode) notFound();

  const doula = await prisma.doula.findUniqueOrThrow({ where: { id: user.doulaId! } });
  const ruleset = await getActiveRuleset(doula.state);
  const prenatalLimit = ruleset
    ? (getCodeRule(ruleset, "PRENATAL")?.maxVisitsPerEpisode ?? null)
    : null;

  const view = buildFamilyView(episode, prenatalLimit);
  const money = summarizeClaims(episode.claims, doula.feeBps);
  const eligibility = client.eligibilityChecks[0];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {client.firstName} {client.lastName}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">{view.subtitle}</p>
        </div>
        <Link
          href={`/visits/new?family=${client.id}`}
          className="rounded-full bg-aubergine px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-mid"
        >
          + Log a visit
        </Link>
      </div>

      {eligibility && eligibility.status !== "ACTIVE" && (
        <div className="mb-4 rounded-xl border border-clay/30 bg-clay-soft px-4 py-3 text-sm text-clay">
          We could not confirm {client.firstName}&apos;s Medicaid coverage on our last check.
          We&apos;re looking into it; you can keep logging visits as usual.
        </div>
      )}

      <div className="rounded-2xl border border-hairline bg-card p-6 shadow-sm">
        <h2 className="mb-5 text-sm font-semibold text-ink-soft">Care and payment journey</h2>
        <JourneyArc stages={view.stages} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-hairline bg-card p-4 text-center">
          <p className="text-xs text-ink-faint">Paid to you</p>
          <p className="tnum mt-1 font-display text-xl font-semibold text-money">
            {formatCents(money.paid)}
          </p>
        </div>
        <div className="rounded-2xl border border-hairline bg-card p-4 text-center">
          <p className="text-xs text-ink-faint">On its way</p>
          <p className="tnum mt-1 font-display text-xl font-semibold text-ink">
            {formatCents(money.onway)}
          </p>
        </div>
        <div className="rounded-2xl border border-hairline bg-card p-4 text-center">
          <p className="text-xs text-ink-faint">Being handled</p>
          <p className="tnum mt-1 font-display text-xl font-semibold text-amber-warm">
            {formatCents(money.hold)}
          </p>
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-display text-lg font-semibold">Visits</h2>
      <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
        <ul className="divide-y divide-hairline">
          {episode.services.map((s) => {
            const plain = SERVICE_PLAIN[s.status] ?? SERVICE_PLAIN.LOGGED;
            return (
              <li key={s.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium">{VISIT_LABEL[s.serviceType]}</p>
                  <p className="text-xs text-ink-faint">
                    {s.serviceDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === "PAID" && (
                    <span className="tnum text-sm font-medium text-money">
                      {formatCents(doulaShare(s.chargeCents, doula.feeBps))}
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${plain.cls}`}>
                    {plain.label}
                  </span>
                </div>
              </li>
            );
          })}
          {episode.services.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-ink-faint">
              No visits yet. Log the first one and we&apos;ll take it from there.
            </li>
          )}
        </ul>
      </div>

      {episode.claims.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 font-display text-lg font-semibold">Payments for this family</h2>
          <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
            <ul className="divide-y divide-hairline">
              {episode.claims.map((c) => {
                const bucket = claimBucket(c.status);
                const amount =
                  bucket === "paid"
                    ? doulaShare(c.totalPaidCents, doula.feeBps)
                    : doulaShare(c.totalChargeCents, doula.feeBps);
                return (
                  <li key={c.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium">{BUCKET_LABEL[bucket]}</p>
                      <p className="text-xs text-ink-faint">
                        {bucket === "paid"
                          ? "Landed in your account"
                          : bucket === "onway"
                            ? "Usually about two weeks"
                            : bucket === "hold"
                              ? "We're on it, nothing for you to do"
                              : "We're preparing the paperwork"}
                      </p>
                    </div>
                    <span className="tnum text-sm font-semibold">{formatCents(amount)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
