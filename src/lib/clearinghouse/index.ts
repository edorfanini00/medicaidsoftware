import { ClaimMdAdapter } from "./claimmd";
import { MockClearinghouse } from "./mock";
import { StediAdapter } from "./stedi";
import type { ClearinghouseAdapter } from "./types";

let instance: ClearinghouseAdapter | undefined;

// Adapter selection is an env concern, not an application concern.
// CLEARINGHOUSE=mock|claimmd|stedi
export function getClearinghouse(): ClearinghouseAdapter {
  if (instance) return instance;
  const which = process.env.CLEARINGHOUSE ?? "mock";
  switch (which) {
    case "claimmd": {
      const key = process.env.CLAIMMD_ACCOUNT_KEY;
      if (!key) throw new Error("CLAIMMD_ACCOUNT_KEY is not set");
      instance = new ClaimMdAdapter(key);
      break;
    }
    case "stedi": {
      const key = process.env.STEDI_API_KEY;
      if (!key) throw new Error("STEDI_API_KEY is not set");
      instance = new StediAdapter(key);
      break;
    }
    default:
      instance = new MockClearinghouse();
  }
  return instance;
}

export type { ClearinghouseAdapter } from "./types";
