import type { Color } from "./colors.ts";
import type { Operation } from "./operad.ts";

/**
 * Sixteen typed seats for one Jev call per element.
 * Not sixteen copies of the same prompt. Each seat is a port.
 * Official cheap path: many questions in one call (elder C7).
 */

export const SEATS = [
  "lexicographer",
  "colorist",
  "primitive-picker",
  "masker",
  "adversary",
  "evidence-clerk",
  "leakage-auditor",
  "decision-metric",
  "restriction-map",
  "glue-checker",
  "fail-closed-gate",
  "harness-teacher",
  "calibration-steward",
  "temporal-steward",
  "domain-expert",
  "judge",
] as const;

export type Seat = (typeof SEATS)[number];

export type JevPrimitive = "noul" | "choice" | "score";

export interface SeatSpec {
  seat: Seat;
  primitive: JevPrimitive;
  name: string;
  prompt: string;
  options?: string[];
  port: Color;
}

export const SEAT_SPECS: Record<Seat, SeatSpec> = {
  lexicographer: {
    seat: "lexicographer",
    primitive: "noul",
    name: "lexicon_grounded",
    prompt: "Is every content word in this item in the JEV lexicon or a named locator?",
    port: "concept",
  },
  colorist: {
    seat: "colorist",
    primitive: "choice",
    name: "gold_color",
    prompt: "What color is the [MASK] / decision port?",
    options: ["entity", "concept", "idea", "evidence", "action"],
    port: "concept",
  },
  "primitive-picker": {
    seat: "primitive-picker",
    primitive: "choice",
    name: "primitive",
    prompt: "Which Jev primitive should code branch on?",
    options: ["noul", "choice", "score"],
    port: "concept",
  },
  masker: {
    seat: "masker",
    primitive: "noul",
    name: "has_single_mask",
    prompt: "Does the item contain exactly one [MASK] or one typed question name?",
    port: "concept",
  },
  adversary: {
    seat: "adversary",
    primitive: "choice",
    name: "toxin_color",
    prompt: "Which forbidden color is the strongest adversarial fill?",
    options: ["entity", "concept", "idea", "evidence", "action"],
    port: "idea",
  },
  "evidence-clerk": {
    seat: "evidence-clerk",
    primitive: "noul",
    name: "locator_in_digest",
    prompt: "Is every evidence locator listed in jev-elder/DIGEST.md?",
    port: "evidence",
  },
  "leakage-auditor": {
    seat: "leakage-auditor",
    primitive: "noul",
    name: "leaky_split",
    prompt: "Does the item invite a random i.i.d. split or future-label leakage?",
    port: "evidence",
  },
  "decision-metric": {
    seat: "decision-metric",
    primitive: "noul",
    name: "metric_is_buyer",
    prompt: "Is the named metric a buyer decision metric (not bare accuracy)?",
    port: "evidence",
  },
  "restriction-map": {
    seat: "restriction-map",
    primitive: "noul",
    name: "restrictions_agree",
    prompt: "Do overlapping covers assign the same color to the shared span?",
    port: "concept",
  },
  "glue-checker": {
    seat: "glue-checker",
    primitive: "choice",
    name: "glue",
    prompt: "Glue status of this element against L0 contracts.",
    options: ["green", "orange", "red"],
    port: "evidence",
  },
  "fail-closed-gate": {
    seat: "fail-closed-gate",
    primitive: "choice",
    name: "verdict",
    prompt: "May composition ship?",
    options: ["GREEN", "AMBER", "RED"],
    port: "action",
  },
  "harness-teacher": {
    seat: "harness-teacher",
    primitive: "noul",
    name: "harness_can_branch",
    prompt: "Can the agent harness branch on this answer without writing prose?",
    port: "action",
  },
  "calibration-steward": {
    seat: "calibration-steward",
    primitive: "score",
    name: "midband_risk",
    prompt: "How likely is this call to land in the mid-band coin-flip zone?",
    port: "evidence",
  },
  "temporal-steward": {
    seat: "temporal-steward",
    primitive: "noul",
    name: "temporal_split",
    prompt: "If the concept is enterprise-temporal, is the split time-based?",
    port: "evidence",
  },
  "domain-expert": {
    seat: "domain-expert",
    primitive: "score",
    name: "proxy_fidelity",
    prompt: "How faithfully does the public proxy stand in for the $M gold asset?",
    port: "idea",
  },
  judge: {
    seat: "judge",
    primitive: "choice",
    name: "compose",
    prompt: "Final gate: compose, escalate, or refuse.",
    options: ["compose", "escalate", "refuse"],
    port: "action",
  },
};

/** One Jev call: state + 16 typed questions. */
export interface FillQuery {
  model: "jev-1.13.0";
  state: Record<string, unknown>;
  questions: Array<{
    name: string;
    type: JevPrimitive;
    prompt: string;
    options?: string[];
    seat: Seat;
  }>;
}

export function buildFillQuery(state: Record<string, unknown>): FillQuery {
  return {
    model: "jev-1.13.0",
    state,
    questions: SEATS.map((seat) => {
      const spec = SEAT_SPECS[seat];
      return {
        name: spec.name,
        type: spec.primitive,
        prompt: spec.prompt,
        options: spec.options,
        seat,
      };
    }),
  };
}

/** Operadic profile: 16 input ports, output evidence (the fill record). */
export function fillOperation(): Operation {
  return {
    id: "sixteen-seat-fill",
    name: "Sixteen-seat fill",
    output: "evidence",
    inputs: SEATS.map((s) => SEAT_SPECS[s].port),
    doctrine: "port-plugging",
    note: "One query, sixteen typed seats. γ only on color match. Fail closed.",
  };
}
