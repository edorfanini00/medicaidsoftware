import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { summarizeClaims } from "@/lib/plain";
import { buildFamilyView } from "@/lib/families";
import { getActiveRuleset, getCodeRule } from "@/lib/rulesets";
import { FamilyCard } from "@/components/FamilyCard";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DoulaHome() {
  const user = await requireUser("DOULA");
  const doula = await prisma.doula.findUniqueOrThrow({
    where: { id: user.doulaId! },
    include: {
      claims: true,
      episodes: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { client: true, services: true, claims: true },
      },
    },
  });

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const money = summarizeClaims(doula.claims, doula.feeBps);
  const paidEpisodeCount = await prisma.claim.findMany({
    where: { renderingDoulaId: doula.id, status: { in: ["PAID", "PARTIALLY_PAID"] }, updatedAt: { gte: yearStart } },
    select: { episodeId: true },
    distinct: ["episodeId"],
  });

  const ruleset = await getActiveRuleset(doula.state);
  const prenatalLimit = ruleset
    ? (getCodeRule(ruleset, "PRENATAL")?.maxVisitsPerEpisode ?? null)
    : null;

  const families = doula.episodes.map((e) => buildFamilyView(e, prenatalLimit));
  const firstName = user.name.split(" ")[0];
  const totalPipeline = money.paid + money.onway + money.hold;
  const paidShare = totalPipeline > 0 ? Math.max(0.04, money.paid / totalPipeline) : 0;

  const statusSentence =
    money.holdCount > 0
      ? `${families.length} ${families.length === 1 ? "family" : "families"} in your care. We're sorting out ${money.holdCount === 1 ? "one payment" : `${money.holdCount} payments`}, nothing for you to do.`
      : `${families.length} ${families.length === 1 ? "family" : "families"} in your care. Everything is on track and nothing needs you right now.`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">{statusSentence}</p>
        </div>
        <Link
          href="/families/new"
          className="rounded-full bg-aubergine px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-mid"
        >
          + Add a family
        </Link>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-aubergine p-6 text-white shadow-sm">
          <p className="flex items-center gap-2 text-sm text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-clay" aria-hidden />
            Paid to you this year
          </p>
          <p className="tnum mt-2 font-display text-4xl font-semibold">
            {formatCents(money.paid)}
          </p>
          <p className="mt-1 text-sm text-white/50">
            Across {paidEpisodeCount.length} {paidEpisodeCount.length === 1 ? "birth" : "births"} since January
          </p>
          <div
            className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15"
            role="img"
            aria-label={`${Math.round(paidShare * 100)} percent of this year's expected money has been paid`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-clay to-violet-mid"
              style={{ width: `${paidShare * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-money" aria-hidden />
            On its way
          </p>
          <p className="tnum mt-2 font-display text-3xl font-semibold text-money">
            {formatCents(money.onway)}
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            {money.onwayCount === 0
              ? "Nothing in flight right now"
              : `${money.onwayCount} ${money.onwayCount === 1 ? "claim" : "claims"}, paid in ~2 weeks`}
          </p>
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-warm" aria-hidden />
            We&apos;re handling
          </p>
          <p className="tnum mt-2 font-display text-3xl font-semibold text-amber-warm">
            {formatCents(money.hold)}
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            {money.holdCount === 0
              ? "No holds, all clear"
              : `${money.holdCount} ${money.holdCount === 1 ? "hold" : "holds"}, nothing for you to do`}
          </p>
        </div>
      </div>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Your families</h2>
        <Link href="/families" className="text-sm text-violet-mid hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {families.map((f, i) => (
          <FamilyCard
            key={f.id}
            href={`/families/${f.id}`}
            name={f.name}
            subtitle={f.subtitle}
            badge={f.badge}
            stages={f.stages}
            index={i}
          />
        ))}
        {families.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline bg-card p-8 text-center">
            <p className="font-medium text-ink">No families yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Add your first family and we&apos;ll check their Medicaid coverage right away.
              You log visits, we handle everything else.
            </p>
            <Link
              href="/families/new"
              className="mt-4 inline-block rounded-full bg-aubergine px-4 py-2 text-sm font-medium text-white hover:bg-violet-mid"
            >
              Add a family
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
