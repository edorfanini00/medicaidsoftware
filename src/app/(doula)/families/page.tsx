import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildFamilyView } from "@/lib/families";
import { getActiveRuleset, getCodeRule } from "@/lib/rulesets";
import { FamilyCard } from "@/components/FamilyCard";

export const dynamic = "force-dynamic";

export default async function FamiliesPage() {
  const user = await requireUser("DOULA");
  const doula = await prisma.doula.findUniqueOrThrow({
    where: { id: user.doulaId! },
    include: {
      episodes: {
        orderBy: { createdAt: "desc" },
        include: { client: true, services: true, claims: true },
      },
    },
  });

  const ruleset = await getActiveRuleset(doula.state);
  const prenatalLimit = ruleset
    ? (getCodeRule(ruleset, "PRENATAL")?.maxVisitsPerEpisode ?? null)
    : null;

  const active = doula.episodes.filter((e) => e.status === "ACTIVE");
  const past = doula.episodes.filter((e) => e.status !== "ACTIVE");

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">My families</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Everyone in your care, and where each family stands.
          </p>
        </div>
        <Link
          href="/families/new"
          className="rounded-full bg-aubergine px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-mid"
        >
          + Add a family
        </Link>
      </div>

      <div className="space-y-3">
        {active.map((e, i) => {
          const f = buildFamilyView(e, prenatalLimit);
          return (
            <FamilyCard
              key={f.id}
              href={`/families/${f.id}`}
              name={f.name}
              subtitle={f.subtitle}
              badge={f.badge}
              stages={f.stages}
              index={i}
            />
          );
        })}
        {active.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline bg-card p-8 text-center">
            <p className="font-medium">No families in your care right now</p>
            <p className="mt-1 text-sm text-ink-soft">Add a family to get started.</p>
          </div>
        )}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 font-display text-lg font-semibold">Completed care</h2>
          <div className="space-y-3">
            {past.map((e, i) => {
              const f = buildFamilyView(e, prenatalLimit);
              return (
                <FamilyCard
                  key={f.id}
                  href={`/families/${f.id}`}
                  name={f.name}
                  subtitle={f.subtitle}
                  badge={f.badge}
                  stages={f.stages}
                  index={i + active.length}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
