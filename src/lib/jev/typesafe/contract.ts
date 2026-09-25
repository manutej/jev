/**
 * TypeSafe System One wire contract.
 *
 * Source of truth: https://docs.typesafe.ai/api.md (live).
 * Pin: jev-1.13.0 (elder C0). Never jev-latest in production.
 *
 * This module is a pure codec. No fetch, no keys, no IO (elder C8).
 * The workbench / Vercel route owns effects.
 */

import { CONTRACT, ENDPOINT, PIN } from "../../../../.jev/jev-core.ts";

/** One source: the pin and endpoint come from the vendored jev-core contract (`.jev/`). */
export const TYPESAFE_PINNED_MODEL = PIN;
export type TypesafePinnedModel = typeof TYPESAFE_PINNED_MODEL;

export const TYPESAFE_ENDPOINT = ENDPOINT;

export type JsonText = string | Record<string, unknown> | unknown[];

export type Primitive = "noul" | "choice" | "score";

export interface NoulQuestion {
  type: "noul";
  instructions: JsonText;
  criteria?: { true?: JsonText; false?: JsonText } | JsonText;
}

export interface ChoiceQuestion {
  type: "choice";
  instructions: JsonText;
  criteria: Record<string, JsonText | null>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: JsonText;
  /** Ordered standalone levels. API: min 2, max 10. */
  criteria: JsonText[];
}

export type TypesafeQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface SystemOneRequest {
  state: JsonText;
  model: TypesafePinnedModel;
  questions: Record<string, TypesafeQuestion>;
}

export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

export type TypesafeAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface SystemOneResponse {
  model: string;
  answers: Record<string, TypesafeAnswer>;
  usage: { input_tokens: number; output_tokens: number };
}

export type ContractError = {
  kind:
    | "empty-questions"
    | "missing-instructions"
    | "choice-criteria"
    | "score-levels"
    | "score-level-count"
    | "wrong-model"
    | "noul-type"
    | "choice-type"
    | "score-type"
    | "unknown-type";
  id?: string;
  message: string;
};

export const SCORE_LEVEL_MIN = 2;
export const SCORE_LEVEL_MAX = 10;
export const CHOICE_OPTION_MAX = 255;
export const NOUL_MID_LOW = CONTRACT.question_types.noul.mid_band[0];
export const NOUL_MID_HIGH = CONTRACT.question_types.noul.mid_band[1];

function hasInstructions(q: TypesafeQuestion): boolean {
  if (typeof q.instructions === "string") return q.instructions.trim().length > 0;
  return q.instructions != null;
}

export function validateQuestion(
  id: string,
  q: TypesafeQuestion,
): ContractError | null {
  if (!hasInstructions(q)) {
    return { kind: "missing-instructions", id, message: `${id}: instructions required` };
  }
  if (q.type === "noul") return null;
  if (q.type === "choice") {
    const keys = Object.keys(q.criteria ?? {});
    if (keys.length < 2) {
      return {
        kind: "choice-criteria",
        id,
        message: `${id}: Choice needs at least 2 criteria keys`,
      };
    }
    if (keys.length > CHOICE_OPTION_MAX) {
      return {
        kind: "choice-criteria",
        id,
        message: `${id}: Choice exceeds ${CHOICE_OPTION_MAX} options`,
      };
    }
    return null;
  }
  if (q.type === "score") {
    const n = q.criteria?.length ?? 0;
    if (n < SCORE_LEVEL_MIN || n > SCORE_LEVEL_MAX) {
      return {
        kind: "score-level-count",
        id,
        message: `${id}: Score needs ${SCORE_LEVEL_MIN}-${SCORE_LEVEL_MAX} levels, got ${n}`,
      };
    }
    for (let i = 0; i < n; i++) {
      const level = q.criteria[i];
      if (typeof level === "string" && level.trim().length === 0) {
        return { kind: "score-levels", id, message: `${id}: level ${i} is empty` };
      }
    }
    return null;
  }
  return { kind: "unknown-type", id, message: `${id}: unknown type` };
}

export function validateRequest(req: SystemOneRequest): ContractError | null {
  const ids = Object.keys(req.questions);
  if (ids.length === 0) {
    return { kind: "empty-questions", message: "questions map is empty" };
  }
  if (req.model !== TYPESAFE_PINNED_MODEL) {
    return {
      kind: "wrong-model",
      message: `model must be ${TYPESAFE_PINNED_MODEL}, got ${req.model}`,
    };
  }
  for (const id of ids) {
    const err = validateQuestion(id, req.questions[id]!);
    if (err) return err;
  }
  return null;
}

export function isMidBandNoul(n: number): boolean {
  return n > NOUL_MID_LOW && n < NOUL_MID_HIGH;
}
