import type { CareEpisode, Claim, Client, Service } from "@prisma/client";
import type { JourneyStage } from "@/components/JourneyArc";
import { familyBadge, monthName, weeksAlong, type MoneyBucket } from "./plain";

export type FamilyView = {
  id: string;
  name: string;
  subtitle: string;
  badge: { label: string; bucket: MoneyBucket } | null;
  stages: JourneyStage[];
};

type EpisodeWithAll = CareEpisode & {
  client: Client;
  services: Service[];
  claims: Claim[];
};

// Builds the doula-facing view of a family: where they are in care and how
// the money stands, in plain language. The journey arc states come from the
// episode, the badge from the claims.
export function buildFamilyView(
  episode: EpisodeWithAll,
  prenatalLimit: number | null
): FamilyView {
  const { client, services, claims } = episode;
  const delivered = Boolean(episode.actualDeliveryDate);
  const prenatalCount = services.filter((s) => s.serviceType === "PRENATAL").length;
  const postpartumCount = services.filter((s) => s.serviceType === "POSTPARTUM").length;
  const closed = episode.status !== "ACTIVE";

  const stages: JourneyStage[] = [
    {
      label: "Prenatal",
      sublabel: prenatalLimit
        ? `${prenatalCount} of ${prenatalLimit} visits`
        : `${prenatalCount} visit${prenatalCount === 1 ? "" : "s"}`,
      state: delivered || prenatalCount > 0 ? "done" : "current",
    },
    {
      label: "Birth",
      sublabel: delivered
        ? `Delivered ${episode.actualDeliveryDate!.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : episode.expectedDeliveryDate
          ? `Due in ${monthName(episode.expectedDeliveryDate)}`
          : "Date not set",
      state: delivered ? "done" : "current",
    },
    {
      label: "Postpartum",
      sublabel: closed
        ? "Complete"
        : delivered
          ? postpartumCount > 0
            ? `${postpartumCount} visit${postpartumCount === 1 ? "" : "s"}`
            : "Starting"
          : "Not started",
      state: closed ? "done" : delivered ? "current" : "future",
    },
  ];

  const weeks = weeksAlong(episode.expectedDeliveryDate);
  const nextBits: string[] = [];
  if (!delivered && weeks) nextBits.push(`${weeks} weeks`);
  if (delivered) nextBits.push("postpartum care");
  const subtitle = nextBits.length > 0 ? nextBits.join(" \u00b7 ") : "In your care";

  return {
    id: client.id,
    name: `${client.firstName} ${client.lastName.charAt(0)}.`,
    subtitle,
    badge: familyBadge(claims),
    stages,
  };
}
