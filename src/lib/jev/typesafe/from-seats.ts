/**
 * from-seats.ts — the seats → one legal `SystemOneRequest`.
 *
 * Pure codec. No fetch, no keys, no clock, no IO (elder C8 / P6).
 * The pin is read from `TYPESAFE_PINNED_MODEL`; it is never written as a literal
 * anywhere but its own definition (P1, G7).
 */
import { COLOR_CRITERIA, SEATS, SEAT_SPECS, type Seat } from "../seats.ts";
import { isColor, type Color } from "../colors.ts";
import { ok, err, type Result } from "../fp/result.ts";
import {
  TYPESAFE_PINNED_MODEL,
  validateRequest,
  type ContractError,
  type SystemOneRequest,
  type TypesafeQuestion,
} from "./contract.ts";

/**
 * The state blob every question is written against.
 *
 * SPEC 0.2.0 left `state` opaque (`JsonText`), so no prompt could name a path and
 * no code could check that what the prompts reference is present (TRIAGE T41).
 * It is named here, in the codec, because that is the only place that both writes
 * the questions and sees the blob. `item` mirrors `corpus.ts:MaskItem`; `concept`
 * mirrors the fields of `concepts.ts:ConceptCard` the prompts actually read.
 */
export interface SeatsStateItem {
  readonly id?: string;
  readonly text: string;
  readonly allowed: readonly Color[];
  readonly forbidden: readonly Color[];
  readonly note?: string;
}

export interface SeatsStateConcept {
  readonly name?: string;
  readonly gold?: string;
  readonly proxy?: string;
  readonly locator?: string;
  readonly metric?: string;
  readonly temporal?: boolean;
}

export interface SeatsState {
  readonly item: SeatsStateItem;
  readonly concept?: SeatsStateConcept;
}

/** The mask token every item carries exactly one of. */
export const MASK_TOKEN = "[MASK]";

/**
 * The deleted `masker` seat, as code.
 *
 * It used to ask a model "does the item contain exactly one `[MASK]`?" — a count,
 * which is an exact calculation and belongs in code (SKILL: *"Keep known rules,
 * calculations, exact lookups, and execution in code"*). It is a substring count.
 */
export function countMasks(text: string): number {
  let n = 0;
  let i = text.indexOf(MASK_TOKEN);
  while (i !== -1) {
    n += 1;
    i = text.indexOf(MASK_TOKEN, i + MASK_TOKEN.length);
  }
  return n;
}

/** The no-match outcome on `toxin_color`. The model cannot choose an omitted value. */
export const NO_TOXIN = "none";

/**
 * Choice descriptions for the seats whose options are fixed. Every option a seat
 * can emit has a description here; no `null` and no blank is ever emitted (G4).
 * `gold_color` reuses `COLOR_CRITERIA` rather than retyping the five kinds.
 */
export const CHOICE_CRITERIA: Record<string, Record<string, string>> = {
  primitive: {
    noul:
      "A probability between 0 and 1 that one stated condition holds. Code branches on a " +
      "threshold. Use one per condition when several conditions may hold at once.",
    choice:
      "One option picked from a list of named alternatives that are described in advance. " +
      "Code branches on which name came back.",
    score:
      "A position on an ordered ladder of described situations. Code branches on the rank, " +
      "or compares ranks across items.",
  },
  split_leakage: {
    random_rows:
      "Rows are divided at random, so rows recorded at the same time, or from the same " +
      "patient, machine, customer or site, can land on both sides of the division.",
    future_information:
      "The part used for measurement is scored using information that would not have been " +
      "known at the moment the prediction has to be made.",
    time_or_group:
      "The division is made by time, or by whole groups kept intact, and nothing from the " +
      "measured part is available while the model is fitted.",
    not_described:
      "This state does not say how the data is divided, or does not describe fitting and " +
      "measuring at all.",
  },
  temporal_split: {
    time_ordered:
      "The subject matter changes over time, and the state describes a division that keeps " +
      "time order: everything measured comes after everything fitted.",
    ignores_time:
      "The subject matter changes over time, and the state describes a division that ignores " +
      "time order — for example a random division of all the rows.",
    not_temporal:
      "The subject matter does not change over time in a way that matters here, so time " +
      "order is not required of the division.",
    not_described:
      "The state does not say enough about either the subject matter or the division to tell " +
      "these cases apart.",
  },
};

function stateError(message: string): ContractError {
  return { kind: "state-shape", message };
}

function checkState(state: SeatsState): ContractError | null {
  const item = state?.item;
  if (!item || typeof item.text !== "string" || item.text.trim().length === 0) {
    return stateError("state.item.text is required and must be a non-empty string");
  }
  if (!Array.isArray(item.allowed) || !Array.isArray(item.forbidden)) {
    return stateError("state.item.allowed and state.item.forbidden must be arrays");
  }
  for (const c of [...item.allowed, ...item.forbidden]) {
    if (!isColor(c)) return stateError(c + " is not one of the five interface kinds");
  }
  const masks = countMasks(item.text);
  if (masks !== 1) {
    // the `masker` seat, as code: a count, not a judgment.
    return stateError(
      "state.item.text must contain exactly one " + MASK_TOKEN + ", found " + masks,
    );
  }
  const overlap = item.allowed.filter((c) => item.forbidden.includes(c));
  if (overlap.length > 0) {
    return stateError("allowed and forbidden overlap on " + overlap.join(", "));
  }
  if (item.forbidden.length === 0) {
    // `toxin_color`'s candidates ARE the forbidden kinds; with none there is no
    // question to ask and a Choice with one key is illegal anyway.
    return stateError("state.item.forbidden must name at least one kind");
  }
  return null;
}

/** `toxin_color`'s candidates: the forbidden kinds, plus an explicit no-match. */
export function toxinCriteria(forbidden: readonly Color[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of forbidden) out[c] = COLOR_CRITERIA[c];
  out[NO_TOXIN] =
    "None of these — no kind listed above is a plausible reading of the marked span.";
  return out;
}

function noulCriteria(name: string): { true: string; false: string } | undefined {
  const table: Record<string, { true: string; false: string }> = {
    terms_defined_in_text: {
      true: "Every specialised term is defined in the text or is a proper name.",
      false: "At least one specialised term is used without being defined or named.",
    },
    locators_resolvable: {
      true: "Every source named in the state could be opened by a reader who has only it.",
      false: "At least one source is described but not named or addressed.",
    },
    metric_is_decision: {
      true: "Improving the measurement would change what somebody does.",
      false: "The measurement only reports correctness, with no action or cost attached.",
    },
    restrictions_agree: {
      true: "Every overlapping description assigns the same kind to the shared stretch.",
      false: "Two descriptions assign different kinds to a stretch they both cover.",
    },
    harness_can_branch: {
      true: "The judgment reduces to a probability, a named option, or a rank.",
      false: "Acting on the judgment would require reading free text.",
    },
  };
  return table[name];
}

function questionFor(seat: Seat, state: SeatsState): TypesafeQuestion | ContractError {
  const spec = SEAT_SPECS[seat];
  const instructions = spec.prompt;

  if (spec.primitive === "noul") {
    const criteria = noulCriteria(spec.name);
    return criteria ? { type: "noul", instructions, criteria } : { type: "noul", instructions };
  }

  if (spec.primitive === "choice") {
    const criteria = choiceCriteria(spec, state);
    if (criteria === null) {
      return {
        kind: "choice-criteria",
        id: spec.name,
        message: spec.name + ": no description table for this seat",
      };
    }
    for (const [k, v] of Object.entries(criteria)) {
      if (typeof v !== "string" || v.trim().length === 0) {
        return {
          kind: "choice-criteria",
          id: spec.name,
          message: spec.name + ": option " + k + " has no description",
        };
      }
    }
    return { type: "choice", instructions, criteria };
  }

  const levels = spec.levels;
  if (!levels || levels.length === 0) {
    return { kind: "score-levels", id: spec.name, message: spec.name + ": no levels" };
  }
  return { type: "score", instructions, criteria: [...levels] };
}

function choiceCriteria(
  spec: (typeof SEAT_SPECS)[Seat],
  state: SeatsState,
): Record<string, string> | null {
  if (spec.name === "toxin_color") return toxinCriteria(state.item.forbidden);
  if (spec.name === "gold_color") {
    const out: Record<string, string> = {};
    for (const c of spec.options ?? []) {
      if (!isColor(c)) return null;
      out[c] = COLOR_CRITERIA[c];
    }
    return out;
  }
  const table = CHOICE_CRITERIA[spec.name];
  if (!table) return null;
  const out: Record<string, string> = {};
  for (const o of spec.options ?? []) {
    const d = table[o];
    if (typeof d !== "string") return null;
    out[o] = d;
  }
  return out;
}

/**
 * The seats → one legal request, or an error. A caller can never hold an illegal
 * body: `fromSeats` runs `validateRequest` on its own output before returning it.
 */
export function fromSeats(state: SeatsState): Result<SystemOneRequest, ContractError> {
  const bad = checkState(state);
  if (bad) return err(bad);

  const questions: Record<string, TypesafeQuestion> = {};
  for (const seat of SEATS) {
    const q = questionFor(seat, state);
    if ("kind" in q && "message" in q) return err(q as ContractError);
    questions[SEAT_SPECS[seat].name] = q as TypesafeQuestion;
  }

  const req: SystemOneRequest = {
    state: state as unknown as Record<string, unknown>,
    model: TYPESAFE_PINNED_MODEL,
    questions,
  };
  const e = validateRequest(req);
  return e ? err(e) : ok(req);
}

export function seatOfQuestionId(id: string): Seat | undefined {
  return SEATS.find((s) => SEAT_SPECS[s].name === id);
}

/** The option keys a seat may legally answer with, given the state it was built from. */
export function criteriaKeysOf(seat: Seat, state?: SeatsState): readonly string[] | undefined {
  const spec = SEAT_SPECS[seat];
  if (spec.primitive !== "choice") return undefined;
  if (spec.name === "toxin_color") {
    return state ? Object.keys(toxinCriteria(state.item.forbidden)) : undefined;
  }
  return spec.options;
}
