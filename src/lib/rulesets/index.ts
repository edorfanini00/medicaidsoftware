import type { Prisma, ServiceType, StateRuleset, ServiceCodeRule } from "@prisma/client";
import { prisma } from "../db";

export type RulesetWithRules = StateRuleset & { codeRules: ServiceCodeRule[] };

// The active ruleset for a state. The claim builder and validator read only
// from this; there is no state-specific branching anywhere in the codebase.
export async function getActiveRuleset(
  state: string,
  tx: Prisma.TransactionClient = prisma
): Promise<RulesetWithRules | null> {
  return tx.stateRuleset.findFirst({
    where: { state, active: true },
    include: { codeRules: true },
    orderBy: { version: "desc" },
  });
}

export function getCodeRule(
  ruleset: RulesetWithRules,
  serviceType: ServiceType
): ServiceCodeRule | undefined {
  return ruleset.codeRules.find((r) => r.serviceType === serviceType);
}
