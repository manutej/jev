/**
 * Answers + local score → verdict. Pure; no IO.
 *
 * Two gate rules from docs/TYPESAFE.md, on top of `scoreFill`:
 *   1. A mid-band Noul on a load-bearing seat demotes GREEN → AMBER (jev-core `isMidBand`, C2).
 *   2. A judge Choice cannot override a local RED (jev-core: a local RED is final).
 *
 * The verdict is computed in code. The judge's choice is recorded, never obeyed.
 */

import { isMidBand } from "../../../../.jev/jev-core.ts";
import type { JevScore, Verdict } from "../score.ts";
import type { ChoiceAnswer, NoulAnswer } from "./contract.ts";

export interface ComposeInput {
  /** The local gate: `scoreFill` on the fill's color distribution. */
  local: JevScore;
  /** Noul answers on seats the harness branches on, keyed by question id. */
  loadBearing?: Record<string, NoulAnswer>;
  /** The judge seat's Choice (compose / escalate / refuse). Advisory only. */
  judge?: ChoiceAnswer;
}

export interface Composed {
  verdict: Verdict;
  reasons: string[];
}

export function composeVerdict(input: ComposeInput): Composed {
  const reasons = [...input.local.reasons];
  const judge = input.judge?.choice;
  if (input.local.verdict === "RED") {
    if (judge !== undefined && judge !== "refuse") {
      reasons.push(`Judge chose ${judge}; a local RED is final`);
    }
    return { verdict: "RED", reasons };
  }
  let verdict: Verdict = input.local.verdict;
  const mid = Object.entries(input.loadBearing ?? {})
    .filter(([, a]) => isMidBand(a))
    .map(([id]) => id);
  if (verdict === "GREEN" && mid.length > 0) {
    verdict = "AMBER";
    reasons.push(`Mid-band noul on load-bearing seat ${mid.join(", ")}: GREEN → AMBER`);
    reasons.push("Fail closed — composition does not ship");
  }
  return { verdict, reasons };
}
