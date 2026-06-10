import type { CareEpisode, Service } from "@prisma/client";
import { getCodeRule, type RulesetWithRules } from "../rulesets";

export type ValidationIssue = {
  serviceId: string;
  code: string;
  message: string;
};

// Validates services against the state ruleset and returns the stamped
// billing fields for each valid service. Pure function so it is testable
// without a database.
export function validateServices(
  services: Service[],
  episode: CareEpisode,
  priorServicesInEpisode: Service[],
  ruleset: RulesetWithRules
): {
  issues: ValidationIssue[];
  stamped: Map<
    string,
    {
      procedureCode: string;
      modifier: string | null;
      units: number;
      placeOfService: string;
      diagnosisCodes: string[];
      chargeCents: number;
    }
  >;
} {
  const issues: ValidationIssue[] = [];
  const stamped = new Map<
    string,
    {
      procedureCode: string;
      modifier: string | null;
      units: number;
      placeOfService: string;
      diagnosisCodes: string[];
      chargeCents: number;
    }
  >();

  // Visit counts per service type, counting already-claimed services in the
  // episode plus the ones being validated now, in date order.
  const priorCounts = new Map<string, number>();
  for (const s of priorServicesInEpisode) {
    if (s.status === "CLAIMED" || s.status === "PAID") {
      priorCounts.set(s.serviceType, (priorCounts.get(s.serviceType) ?? 0) + 1);
    }
  }

  const sorted = [...services].sort(
    (a, b) => a.serviceDate.getTime() - b.serviceDate.getTime()
  );
  const runningCounts = new Map<string, number>(priorCounts);

  for (const service of sorted) {
    const rule = getCodeRule(ruleset, service.serviceType);
    if (!rule) {
      issues.push({
        serviceId: service.id,
        code: "NO_CODE_RULE",
        message: `No ${ruleset.state} code rule for service type ${service.serviceType}. The state may not cover it.`,
      });
      continue;
    }

    const count = (runningCounts.get(service.serviceType) ?? 0) + 1;
    runningCounts.set(service.serviceType, count);

    if (rule.maxVisitsPerEpisode != null && count > rule.maxVisitsPerEpisode) {
      issues.push({
        serviceId: service.id,
        code: "VISIT_LIMIT_EXCEEDED",
        message: `${service.serviceType} visit ${count} exceeds the ${ruleset.state} limit of ${rule.maxVisitsPerEpisode} per episode.`,
      });
      continue;
    }

    if (rule.requiresDeliveryDate && !episode.actualDeliveryDate) {
      issues.push({
        serviceId: service.id,
        code: "MISSING_DELIVERY_DATE",
        message: `${service.serviceType} requires the episode's actual delivery date before billing.`,
      });
      continue;
    }

    if (service.serviceDate.getTime() > Date.now()) {
      issues.push({
        serviceId: service.id,
        code: "FUTURE_DATE",
        message: "Service date is in the future.",
      });
      continue;
    }

    const units = rule.unitsPerVisit;
    const diagnosisCodes =
      service.diagnosisCodes.length > 0
        ? service.diagnosisCodes
        : rule.allowedDiagnosisCodes.length > 0
          ? [rule.allowedDiagnosisCodes[0]]
          : ruleset.defaultDiagnosisCodes;

    if (diagnosisCodes.length === 0) {
      issues.push({
        serviceId: service.id,
        code: "NO_DIAGNOSIS",
        message: "No diagnosis code available from the service or the ruleset.",
      });
      continue;
    }

    if (
      service.diagnosisCodes.length > 0 &&
      rule.allowedDiagnosisCodes.length > 0 &&
      !service.diagnosisCodes.every((d) => rule.allowedDiagnosisCodes.includes(d))
    ) {
      issues.push({
        serviceId: service.id,
        code: "DIAGNOSIS_NOT_ALLOWED",
        message: `Diagnosis ${service.diagnosisCodes.join(", ")} is not in the allowed list for ${rule.procedureCode}.`,
      });
      continue;
    }

    stamped.set(service.id, {
      procedureCode: rule.procedureCode,
      modifier: rule.modifier,
      units,
      placeOfService: rule.placeOfService ?? ruleset.defaultPlaceOfService,
      diagnosisCodes,
      chargeCents: rule.rateCents * units,
    });
  }

  return { issues, stamped };
}
