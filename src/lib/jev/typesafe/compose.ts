/**
 * compose.ts — answers + `score_fill` → verdict.
 *
 * Pure. No fetch, no keys, no clock, no IO (elder C8 / P6).
 *
 * The lattice is `RED < AMBER < GREEN` and composition is the **meet**. Every
 * rule may only lower. That meet-only property is what P4 actually promises:
 * no answer from any seat, of any primitive, can raise the composed verdict
 * above `local.verdict`.
 *
 * The rule that matters is R6. Until 0.3.0 the table could read a seat's
 * *uncertainty* (R5) and its *absence* (R3) but never what it actually said, so
 * a complete, well-formed, maximally adverse response composed GREEN with no
 * caps while a single 0.5 capped to AMBER — being confidently adverse was safer
 * than being unsure. R6 reads the answer value against the adverse direction the
 * seat declares in `SEAT_SPECS`.
 */
import type { JevScore, Verdict } from "../score.ts";
import { SEAT_SPECS, LOAD_BEARING_SEATS, SEATS, type Seat } from "../seats.ts";
import { ok, err, type Result } from "../fp/result.ts";
import {
  TYPESAFE_PINNED_MODEL,
  isMidBandNoul,
  type ContractError,
  type SystemOneRequest,
  type SystemOneResponse,
  type TypesafeAnswer,
} from "./contract.ts";
import { seatOfQuestionId, criteriaKeysOf, type SeatsState } from "./from-seats.ts";

export type Cap = { rule: string; seat?: Seat; detail: string };

export interface ComposedVerdict {
  /** The composed verdict. Never above `local.verdict`. */
  verdict: Verdict;
  /** `scoreFill` output, unmodified. */
  local: JevScore;
  /** What the answers alone would say: the same rules seeded at GREEN. */
  model: Verdict;
  /** Every rule that lowered the verdict, in order. */
  caps: Cap[];
  /** Advisory seats: recorded, consumed by no rule. */
  advisories: Record<string, string>;
  reasons: string[];
}

export interface ComposeOptions {
  /**
   * The seats the rules read. It may only WIDEN the default — a caller that
   * passes a narrower set gets `err(load-bearing-set)` rather than silently
   * dropping the seats the default exists to protect.
   */
  loadBearing?: readonly Seat[];
  /**
   * The request these answers reply to. When given, R4 checks each Choice
   * against the criteria actually sent, which is the only way to check
   * `toxin_color`, whose candidates are built from the item's forbidden set.
   */
  request?: SystemOneRequest;
  /** The state the request was built from; a fallback source of `toxin_color`'s keys. */
  state?: SeatsState;
}

const RANK: Record<Verdict, number> = { RED: 0, AMBER: 1, GREEN: 2 };

export function meet(a: Verdict, b: Verdict): Verdict {
  return RANK[a] <= RANK[b] ? a : b;
}

export function leq(a: Verdict, b: Verdict): boolean {
  return RANK[a] <= RANK[b];
}

/** The default load-bearing set: the seats whose `role` says the composer reads them. */
export const DEFAULT_LOAD_BEARING: readonly Seat[] = LOAD_BEARING_SEATS;

/** R7's floor. Documented in docs/TYPESAFE.md beside τ_g, τ_t, τ_r. */
export const CONFIDENCE_FLOOR = 0.5;

/**
 * `err` means DO NOT SHIP. R1 and R2 refuse a response outright and carry no
 * verdict; a caller that reaches for `local.verdict` on that branch ships
 * exactly the responses those rules exist to refuse.
 */
export function verdictOf(r: Result<ComposedVerdict, ContractError>): Verdict {
  return r.ok ? r.value.verdict : "RED";
}

interface Engine {
  v: Verdict;
  caps: Cap[];
}

function lower(e: Engine, rule: string, seat: Seat | undefined, to: Verdict, detail: string): void {
  const nv = meet(e.v, to);
  if (nv !== e.v) {
    e.caps.push({ rule, seat, detail });
    e.v = nv;
  }
}

function answerFor(res: SystemOneResponse, seat: Seat): TypesafeAnswer | undefined {
  return res.answers[SEAT_SPECS[seat].name];
}

function inUnit(n: unknown): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
}

/** R2 — declared type, and the numeric ranges the declared type implies. */
function typeError(id: string, declared: string, a: TypesafeAnswer): ContractError | null {
  if (a?.type !== declared) {
    return {
      kind: (declared + "-type") as ContractError["kind"],
      id,
      message: id + ": expected " + declared + ", got " + String(a?.type),
    };
  }
  if (a.type === "noul" && !inUnit(a.noul)) {
    return { kind: "noul-type", id, message: id + ": noul " + String(a.noul) + " is not in [0,1]" };
  }
  if (a.type !== "noul" && !inUnit(a.confidence)) {
    return {
      kind: (declared + "-type") as ContractError["kind"],
      id,
      message: id + ": confidence " + String(a.confidence) + " is not in [0,1]",
    };
  }
  if (a.type === "score" && !(Number.isInteger(a.score) && a.score >= 0)) {
    return { kind: "score-type", id, message: id + ": score " + String(a.score) + " is not a level index" };
  }
  return null;
}

/** R4 — the option keys this Choice was actually offered. */
function optionsOf(seat: Seat, opts: ComposeOptions | undefined): readonly string[] | undefined {
  const id = SEAT_SPECS[seat].name;
  const q = opts?.request?.questions?.[id];
  if (q && q.type === "choice") return Object.keys(q.criteria);
  return criteriaKeysOf(seat, opts?.state);
}

/** True when the answer matches the adverse direction the seat declares. */
function adverseCap(seat: Seat, a: TypesafeAnswer): Verdict | undefined {
  const adv = SEAT_SPECS[seat].adverse;
  if (adv.kind === "none") return undefined;
  if (adv.kind === "noul-below" && a.type === "noul") {
    return a.noul < adv.threshold ? adv.cap : undefined;
  }
  if (adv.kind === "choice" && a.type === "choice") {
    return adv.caps[a.choice];
  }
  if (adv.kind === "score-at-or-below" && a.type === "score") {
    return a.score <= adv.level ? adv.cap : undefined;
  }
  return undefined;
}

/** R3, R5, R6, R7 from a seed. Run twice: seeded at `local.verdict`, and at GREEN. */
function applyRules(seed: Verdict, res: SystemOneResponse, loadBearing: readonly Seat[]): Engine {
  const e: Engine = { v: seed, caps: [] };

  // R3 — a load-bearing seat has no answer. Absence is never neutral.
  for (const seat of loadBearing) {
    if (answerFor(res, seat) === undefined) {
      lower(e, "R3", seat, "RED", SEAT_SPECS[seat].name + ": no answer");
    }
  }

  // R5 — a mid-band noul on a load-bearing seat (P5).
  for (const seat of loadBearing) {
    const a = answerFor(res, seat);
    if (a?.type === "noul" && isMidBandNoul(a.noul)) {
      lower(e, "R5", seat, "AMBER", SEAT_SPECS[seat].name + ": noul " + a.noul + " is mid-band");
    }
  }

  // R6 — a load-bearing seat's ANSWER VALUE is adverse. THE FIX (TRIAGE T48).
  const firedR6: Seat[] = [];
  for (const seat of loadBearing) {
    const a = answerFor(res, seat);
    if (!a) continue;
    const cap = adverseCap(seat, a);
    if (cap === undefined) continue;
    firedR6.push(seat);
    lower(e, "R6", seat, cap, SEAT_SPECS[seat].name + ": " + describe(a) + " is adverse");
  }

  // R7 — low confidence on a Choice that fired R6.
  // "Fired" means the answer matched the seat's declared adverse direction,
  // whether or not the cap lowered anything. While every declared cap is AMBER
  // or RED this rule cannot lower further (the verdict is already at or below
  // AMBER when it runs); it becomes live for any seat that declares a GREEN cap.
  // See docs/EVALUATION.md, "R7 is inert on the current declarations".
  for (const seat of firedR6) {
    const a = answerFor(res, seat);
    if (a?.type === "choice" && a.confidence < CONFIDENCE_FLOOR) {
      lower(
        e,
        "R7",
        seat,
        "AMBER",
        SEAT_SPECS[seat].name + ": confidence " + a.confidence + " < " + CONFIDENCE_FLOOR,
      );
    }
  }

  return e;
}

function describe(a: TypesafeAnswer): string {
  if (a.type === "noul") return "noul " + a.noul;
  if (a.type === "choice") return "choice " + a.choice;
  return "level " + a.score;
}

export function composeVerdict(
  local: JevScore,
  res: SystemOneResponse,
  opts?: ComposeOptions,
): Result<ComposedVerdict, ContractError> {
  const loadBearing = opts?.loadBearing ?? DEFAULT_LOAD_BEARING;
  if (loadBearing.length === 0) {
    return err({ kind: "load-bearing-set", message: "the load-bearing set may not be empty" });
  }
  const missing = DEFAULT_LOAD_BEARING.filter((s) => !loadBearing.includes(s));
  if (missing.length > 0) {
    return err({
      kind: "load-bearing-set",
      message: "the load-bearing set may only widen the default; it drops " + missing.join(", "),
    });
  }

  // R1 — a reply from an unpinned model is never composed (P1).
  if (res.model !== TYPESAFE_PINNED_MODEL) {
    return err({
      kind: "wrong-model",
      message: "model must be " + TYPESAFE_PINNED_MODEL + ", got " + String(res.model),
    });
  }

  for (const [id, a] of Object.entries(res.answers)) {
    const seat = seatOfQuestionId(id);
    if (!seat) {
      return err({ kind: "unknown-question", id, message: id + ": not a seat question" });
    }
    // R2 — an answer's type (and the ranges that type implies) against its question's.
    const te = typeError(id, SEAT_SPECS[seat].primitive, a);
    if (te) return err(te);

    // R4 — a Choice answer must be a key of its criteria (TRIAGE T06).
    if (a.type === "choice") {
      const keys = optionsOf(seat, opts);
      if (keys && !keys.includes(a.choice)) {
        return {
          ok: false,
          error: {
            kind: "choice-type",
            id,
            message: id + ": " + a.choice + " is not one of " + keys.join(", "),
          },
        };
      }
    }
  }

  // R0 — seed at `local.verdict` from `scoreFill` (P3, P9).
  const composed = applyRules(local.verdict, res, loadBearing);
  const modelOnly = applyRules("GREEN", res, loadBearing);

  const advisories: Record<string, string> = {};
  for (const seat of SEATS) {
    if (loadBearing.includes(seat)) continue;
    const a = answerFor(res, seat);
    if (a) advisories[SEAT_SPECS[seat].name] = describe(a);
  }

  return ok({
    verdict: composed.v,
    local,
    model: modelOnly.v,
    caps: composed.caps,
    advisories,
    reasons: [...local.reasons, ...composed.caps.map((c) => c.rule + ": " + c.detail)],
  });
}
