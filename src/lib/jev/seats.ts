import { COLOR_META, type Color } from "./colors.ts";
import type { Operation } from "./operad.ts";
import type { Verdict } from "./score.ts";
import {
  TYPESAFE_PINNED_MODEL,
  type Primitive,
  type TypesafePinnedModel,
} from "./typesafe/contract.ts";

/**
 * Eleven typed seats for one Jev call per element.
 * Not eleven copies of the same prompt. Each seat is a port.
 * Official cheap path: many questions in one call (elder C7).
 *
 * Five seats were deleted in 0.3.0 and are not coming back:
 *
 * - `fail-closed-gate`, `judge`, `glue-checker` — aggregators that rode in the
 *   same parallel request as the seats they purported to judge. A question in a
 *   `SystemOneRequest` is shown one `state` and its own `instructions`; it can
 *   never see a sibling's answer (`typesafe/contract.ts`). Code composes.
 *   `sign-off: "Code composes; drop them as verdict sources" — user selection, 2026-09-21`
 * - `calibration-steward` — asked the model to predict whether a sibling answer
 *   would land in the mid band, which `isMidBandNoul` computes exactly.
 * - `masker` — asked the model to count `[MASK]` occurrences. Models do not
 *   count; `countMasks` in `typesafe/from-seats.ts` does, at the boundary.
 *
 * Every surviving prompt is self-contained. The question id is never sent to the
 * model and the seat name is invisible to it, so each `prompt` carries its whole
 * meaning, names the state paths it reads, and defines any term it relies on.
 */

export const SEATS = [
  "lexicographer",
  "colorist",
  "primitive-picker",
  "adversary",
  "evidence-clerk",
  "leakage-auditor",
  "decision-metric",
  "restriction-map",
  "harness-teacher",
  "temporal-steward",
  "domain-expert",
] as const;

export type Seat = (typeof SEATS)[number];

/** Alias of the wire contract's `Primitive`. One definition, two names (G7). */
export type JevPrimitive = Primitive;

/**
 * Whether the composer reads this seat.
 *
 * - `load-bearing` — R3 (absence → RED), R5 (mid-band noul → AMBER),
 *   R6 (adverse answer → the declared cap), R7 (low confidence → AMBER).
 * - `advisory` — recorded in `ComposedVerdict.advisories`, consumed by no rule.
 */
export type SeatRole = "load-bearing" | "advisory";

/**
 * How a seat's ANSWER VALUE lowers the verdict (R6), declared at the seat rather
 * than hard-coded in the composer. `null` means the seat has no adverse
 * direction that the composer can evaluate; `reason` says why, so that a missing
 * direction is a recorded decision rather than an omission.
 */
export type SeatAdverse =
  | {
      kind: "noul-below";
      /** An answer strictly below this probability is adverse. */
      threshold: number;
      cap: Verdict;
    }
  | {
      kind: "choice";
      /** option key → the worst verdict that option permits. */
      caps: Readonly<Record<string, Verdict>>;
    }
  | {
      kind: "score-at-or-below";
      /** A chosen level index at or below this is adverse. Levels run worst → best. */
      level: number;
      cap: Verdict;
    }
  | { kind: "none"; reason: string };

export interface SeatSpec {
  seat: Seat;
  primitive: JevPrimitive;
  name: string;
  prompt: string;
  /** Static Choice options. `adversary`'s are built from the state instead. */
  options?: string[];
  /** Ordered Score levels, worst → best. Standalone situations, never a range. */
  levels?: string[];
  port: Color;
  role: SeatRole;
  adverse: SeatAdverse;
}

/** A noul strictly below this is adverse (R6). Documented in docs/TYPESAFE.md. */
export const ADVERSE_NOUL_BELOW = 0.5;

const kind = (c: Color): string => COLOR_META[c].label + " — " + COLOR_META[c].blurb;

/** The five interface kinds, described for a reader who has never seen them. */
export const COLOR_CRITERIA: Record<Color, string> = {
  entity: kind("entity"),
  concept: kind("concept"),
  idea: kind("idea"),
  evidence: kind("evidence"),
  action: kind("action"),
};

export const SEAT_SPECS: Record<Seat, SeatSpec> = {
  lexicographer: {
    seat: "lexicographer",
    primitive: "noul",
    name: "terms_defined_in_text",
    prompt:
      "`item.text` is one claim, written for a reader who has only this state: no glossary, " +
      "no linked documents, no project handbook. Give the probability that every specialised " +
      "term in `item.text` is either defined inside `item.text` itself, or is a proper name " +
      "that identifies one specific thing (a file path, a URL, a dataset, a product, an " +
      "organisation). Ordinary English words count as defined. The literal token `[MASK]` is " +
      "a placeholder for a removed span, not a term — ignore it.",
    port: "concept",
    role: "load-bearing",
    adverse: { kind: "noul-below", threshold: ADVERSE_NOUL_BELOW, cap: "AMBER" },
  },

  colorist: {
    seat: "colorist",
    primitive: "choice",
    name: "gold_color",
    prompt:
      "`item.text` contains exactly one span written as the literal token `[MASK]`. Something " +
      "has been removed from that position. Choose the kind of thing that belongs there. The " +
      "five kinds below are the complete set this system uses, so exactly one of them applies " +
      "and no no-match outcome is offered.",
    options: ["entity", "concept", "idea", "evidence", "action"],
    port: "concept",
    role: "load-bearing",
    adverse: {
      kind: "none",
      reason:
        "Which kind is adverse depends on `item.allowed` / `item.forbidden`, which the " +
        "composer is not given: `JevScore` does not retain the allowed set and " +
        "`SystemOneResponse` never carried it. This is the defect that retired R8. The " +
        "comparison is made in code by scoreFill, not here. Presence (R3) and confidence " +
        "still apply.",
    },
  },

  "primitive-picker": {
    seat: "primitive-picker",
    primitive: "choice",
    name: "primitive",
    prompt:
      "A program must turn the judgment described in `item.text` into a typed answer it can " +
      "branch on without reading prose. Three answer shapes are available. Choose the one " +
      "that fits the judgment `item.text` calls for.",
    options: ["noul", "choice", "score"],
    port: "concept",
    role: "advisory",
    adverse: {
      kind: "none",
      reason:
        "No shape is wrong in itself; this seat reports how the judgment should be typed, " +
        "which is instrument design rather than a defect in the item.",
    },
  },

  adversary: {
    seat: "adversary",
    primitive: "choice",
    name: "toxin_color",
    prompt:
      "`item.text` contains exactly one span written as the literal token `[MASK]`. The kinds " +
      "listed below are the ones that must NOT belong at that position for this item. Choose " +
      "the one a careless reader is most likely to put there anyway. If none of them is a " +
      "plausible reading of the span, choose the last option.",
    // options are built from `item.forbidden` plus a no-match, in from-seats.ts.
    port: "idea",
    role: "advisory",
    adverse: {
      kind: "none",
      reason:
        "Recorded, never a verdict input. " +
        'sign-off: "Delete R8" — user selection, 2026-09-21.',
    },
  },

  "evidence-clerk": {
    seat: "evidence-clerk",
    primitive: "noul",
    name: "locators_resolvable",
    prompt:
      "A source is resolvable when a reader who has only this state could go and open it: a " +
      "URL, a repository path, or a dataset named together with who publishes it. A bare " +
      "description with no name and no address is not resolvable. Give the probability that " +
      "every source named anywhere in this state — in `item.text` and in `concept.locator` " +
      "and `concept.proxy` if those are present — is resolvable in that sense. If the state " +
      "names no source at all, nothing fails, so answer near 1.",
    port: "evidence",
    role: "load-bearing",
    adverse: { kind: "noul-below", threshold: ADVERSE_NOUL_BELOW, cap: "AMBER" },
  },

  "leakage-auditor": {
    seat: "leakage-auditor",
    primitive: "choice",
    name: "split_leakage",
    prompt:
      "This state may describe dividing data into a part used to fit a model and a part used " +
      "to measure it. Read `item.text` and any `concept` fields present. Choose the statement " +
      "that best describes the division this state describes. Judge only what the state says; " +
      "do not assume good practice that is not written down.",
    options: ["random_rows", "future_information", "time_or_group", "not_described"],
    port: "evidence",
    role: "load-bearing",
    adverse: {
      kind: "choice",
      caps: {
        random_rows: "RED",
        future_information: "RED",
        not_described: "AMBER",
      },
    },
  },

  "decision-metric": {
    seat: "decision-metric",
    primitive: "noul",
    name: "metric_is_decision",
    prompt:
      "A measurement carries a decision when improving it changes what somebody does — which " +
      "items get inspected, which patients get seen first, how much stock is ordered, what " +
      "gets refused. A measurement carries no decision when it only reports how often a model " +
      "was right, with no stated cost for being wrong and no action attached. Read the " +
      "measurement named in `item.text` and in `concept.metric` if present. Give the " +
      "probability that improving it would change a decision somebody actually makes.",
    port: "evidence",
    role: "load-bearing",
    adverse: { kind: "noul-below", threshold: ADVERSE_NOUL_BELOW, cap: "AMBER" },
  },

  "restriction-map": {
    seat: "restriction-map",
    primitive: "noul",
    name: "restrictions_agree",
    prompt:
      "This state may describe the same stretch of `item.text` more than once — for example " +
      "two overlapping notes, or a note and `item.note`, that both say what a phrase is. " +
      "Wherever two descriptions overlap, they must assign the same kind to the shared " +
      "stretch; if they disagree, nothing can be built on top of them. Give the probability " +
      "that every overlap in this state is assigned consistently. If nothing in the state " +
      "overlaps, the condition holds, so answer near 1.",
    port: "concept",
    role: "load-bearing",
    // Cap is AMBER, not RED: this seat's firing rate has never been measured
    // against any corpus. An unmeasured veto is the exact defect docs/EVALUATION.md
    // records four times over. Promote to RED only with a measured firing rate.
    adverse: { kind: "noul-below", threshold: ADVERSE_NOUL_BELOW, cap: "AMBER" },
  },

  "harness-teacher": {
    seat: "harness-teacher",
    primitive: "noul",
    name: "harness_can_branch",
    prompt:
      "The answers to these questions are read by a program, which must act on them without a " +
      "person reading any prose. Give the probability that the judgment `item.text` calls for " +
      "can be reduced to one of: a probability between 0 and 1, one option chosen from a named " +
      "list, or a position on an ordered ladder of described situations — with no free text " +
      "needed to make sense of the result.",
    port: "action",
    role: "advisory",
    adverse: {
      kind: "none",
      reason:
        "Judges whether the instrument is well shaped, not whether this item is sound. " +
        "Recorded for instrument design; it must not refuse an item.",
    },
  },

  "temporal-steward": {
    seat: "temporal-steward",
    primitive: "choice",
    name: "temporal_split",
    prompt:
      "Some subject matter changes over time, so a model fitted on later data and measured on " +
      "earlier data would flatter itself. `concept.temporal` is `true` when the subject matter " +
      "changes over time in a way that matters, and may be absent. Read `item.text` and " +
      "`concept.temporal`. Choose the statement that describes this item. The premise is " +
      "stated in the options, so an item whose subject matter does not change over time has " +
      "an option of its own and needs no guess.",
    options: ["time_ordered", "ignores_time", "not_temporal", "not_described"],
    port: "evidence",
    role: "load-bearing",
    adverse: {
      kind: "choice",
      caps: { ignores_time: "RED", not_described: "AMBER" },
    },
  },

  "domain-expert": {
    seat: "domain-expert",
    primitive: "score",
    name: "proxy_fidelity",
    prompt:
      "Work that cannot be done on the real data is often done on a substitute anybody can " +
      "obtain. `concept.gold` names the real thing the work is ultimately about; " +
      "`concept.proxy` names the substitute actually used in its place. If those fields are " +
      "absent, read the same two roles out of `item.text`. Choose the situation below that " +
      "describes the relationship between the substitute and the real thing. The situations " +
      "run from least faithful to most faithful.",
    levels: [
      "The substitute resembles the real thing only on the surface — the same words, the same " +
        "file format, or the same length — while the subject matter is different.",
      "The substitute comes from the same field as the real thing but is produced by a " +
        "different process, so it fails in different ways.",
      "The substitute is produced by the same process as the real thing but is thinner: " +
        "smaller, older, or missing fields.",
      "The substitute is the real thing, or a complete sample drawn from it.",
    ],
    port: "idea",
    role: "load-bearing",
    adverse: { kind: "score-at-or-below", level: 1, cap: "AMBER" },
  },
};

/** The seats the composer reads. Derived, so the two can never drift apart. */
export const LOAD_BEARING_SEATS: readonly Seat[] = SEATS.filter(
  (s) => SEAT_SPECS[s].role === "load-bearing",
);

/** One Jev call: state + the typed questions. */
export interface FillQuery {
  model: TypesafePinnedModel;
  state: Record<string, unknown>;
  questions: Array<{
    name: string;
    type: JevPrimitive;
    prompt: string;
    options?: string[];
    levels?: string[];
    seat: Seat;
  }>;
}

export function buildFillQuery(state: Record<string, unknown>): FillQuery {
  return {
    model: TYPESAFE_PINNED_MODEL,
    state,
    questions: SEATS.map((seat) => {
      const spec = SEAT_SPECS[seat];
      return {
        name: spec.name,
        type: spec.primitive,
        prompt: spec.prompt,
        options: spec.options,
        levels: spec.levels,
        seat,
      };
    }),
  };
}

/** Operadic profile: one input port per seat, output evidence (the fill record). */
export function fillOperation(): Operation {
  return {
    id: "seat-fill",
    name: SEATS.length + "-seat fill",
    output: "evidence",
    inputs: SEATS.map((s) => SEAT_SPECS[s].port),
    doctrine: "port-plugging",
    note:
      "One query, " +
      SEATS.length +
      " typed seats. γ only on color match. Fail closed. Code composes the verdict.",
  };
}
