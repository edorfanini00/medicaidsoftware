import Link from "next/link";
import { JourneyArc, type JourneyStage } from "./JourneyArc";
import type { MoneyBucket } from "@/lib/plain";

const BADGE_STYLES: Record<MoneyBucket, string> = {
  paid: "bg-money-soft text-money",
  onway: "bg-amber-soft text-amber-warm",
  hold: "bg-clay-soft text-clay",
  building: "bg-paper text-ink-soft",
};

const AVATAR_COLORS = ["bg-violet-mid", "bg-money", "bg-clay", "bg-aubergine"];

export function FamilyCard({
  href,
  name,
  subtitle,
  badge,
  stages,
  index = 0,
}: {
  href: string;
  name: string;
  subtitle: string;
  badge: { label: string; bucket: MoneyBucket } | null;
  stages: JourneyStage[];
  index?: number;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-hairline bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
          >
            {initials}
          </span>
          <div>
            <p className="font-medium text-ink">{name}</p>
            <p className="text-xs text-ink-faint">{subtitle}</p>
          </div>
        </div>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_STYLES[badge.bucket]}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className="mt-5">
        <JourneyArc stages={stages} />
      </div>
    </Link>
  );
}
