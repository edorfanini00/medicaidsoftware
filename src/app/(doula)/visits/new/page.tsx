import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogVisitForm } from "@/components/LogVisitForm";

export const dynamic = "force-dynamic";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ family?: string }>;
}) {
  const user = await requireUser("DOULA");
  const { family } = await searchParams;

  const episodes = await prisma.careEpisode.findMany({
    where: { doulaId: user.doulaId!, status: "ACTIVE" },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  const families = episodes.map((e) => ({
    episodeId: e.id,
    clientId: e.clientId,
    name: `${e.client.firstName} ${e.client.lastName}`,
  }));

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Log a visit</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Thirty seconds, then you&apos;re done. We take care of the rest.
        </p>
      </div>
      {families.length > 0 ? (
        <LogVisitForm families={families} preselected={family} />
      ) : (
        <div className="rounded-2xl border border-dashed border-hairline bg-card p-8 text-center">
          <p className="font-medium">No families to log visits for yet</p>
          <Link href="/families/new" className="mt-2 inline-block text-sm text-violet-mid hover:underline">
            Add your first family
          </Link>
        </div>
      )}
    </div>
  );
}
