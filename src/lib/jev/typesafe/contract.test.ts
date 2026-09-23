import assert from "node:assert/strict";
import { test } from "node:test";
// Imported through the barrel on purpose: the broken-barrel defect (G2) cannot
// recur silently while every test in this file reaches the codec through it.
import {
  CHOICE_CRITERIA, CONFIDENCE_FLOOR, DEFAULT_LOAD_BEARING, MASK_TOKEN, NO_TOXIN,
  SCORE_LEVEL_MAX, SCORE_LEVEL_MIN, TYPESAFE_PINNED_MODEL, composeVerdict, countMasks,
  criteriaKeysOf, fromSeats, isMidBandNoul, leq, meet, seatOfQuestionId, toxinCriteria,
  validateRequest, verdictOf,
  type ChoiceAnswer, type NoulAnswer, type ScoreAnswer, type SeatsState,
  type SystemOneRequest, type SystemOneResponse, type TypesafeAnswer,
} from "./index.ts";
import { SEATS, SEAT_SPECS, LOAD_BEARING_SEATS, type Seat } from "../seats.ts";
import { scoreFill, type Dist, type JevScore, type Verdict } from "../score.ts";

// ---------- fixtures (invented stand-ins; no real data) ----------

const STATE: SeatsState = {
  item: {
    id: "t1",
    text: "The warehouse [MASK] holds the terminals table.",
    allowed: ["entity"],
    forbidden: ["action", "idea"],
    note: "A named store of things is an entity.",
  },
  concept: {
    name: "JEV interface color",
    gold: "internal operad of a live agent harness",
    proxy: "manutej/jev colors.ts",
    locator: "https://github.com/manutej/jev",
    metric: "color-mismatch refusal rate",
    temporal: false,
  },
};


function legal(): SystemOneRequest {
  const r = fromSeats(STATE);
  assert.ok(r.ok, JSON.stringify(r));
  return structuredClone(r.value);
}

function score(verdict: Verdict): JevScore {
  const d: Dist = { entity: 0, concept: 0, idea: 0, evidence: 0, action: 0 };
  if (verdict === "GREEN") d.concept = 1;
  else if (verdict === "AMBER") (d.concept = 0.5), (d.entity = 0.5);
  else d.idea = 1;
  const s = scoreFill(d, ["concept"], ["idea"]);
  assert.equal(s.verdict, verdict);
  return s;
}

const choice = (c: string, confidence = 0.9): ChoiceAnswer =>
  ({ type: "choice", choice: c, probabilities: { [c]: confidence }, confidence });
const noul = (n: number): NoulAnswer => ({ type: "noul", noul: n });
const scoreAns = (level: number, confidence = 0.9): ScoreAnswer =>
  ({ type: "score", score: level, legend: {}, probabilities: {}, confidence });

const BENIGN_CHOICE: Record<string, string> = {
  gold_color: "entity",
  primitive: "choice",
  toxin_color: NO_TOXIN,
  split_leakage: "time_or_group",
  temporal_split: "not_temporal",
};

const ADVERSE_CHOICE: Record<string, string> = {
  gold_color: "action",
  primitive: "noul",
  toxin_color: "action",
  split_leakage: "random_rows",
  temporal_split: "ignores_time",
};

function responseFrom(
  nouls: number,
  choices: Record<string, string>,
  level: number,
  confidence = 0.9,
): SystemOneResponse {
  const answers: Record<string, TypesafeAnswer> = {};
  for (const seat of SEATS) {
    const spec = SEAT_SPECS[seat];
    if (spec.primitive === "noul") answers[spec.name] = noul(nouls);
    else if (spec.primitive === "score") answers[spec.name] = scoreAns(level, confidence);
    else answers[spec.name] = choice(choices[spec.name]!, confidence);
  }
  return { model: TYPESAFE_PINNED_MODEL, answers, usage: { input_tokens: 1, output_tokens: 1 } };
}

/** Complete, well-formed, entirely benign. */
function benign(): SystemOneResponse {
  return responseFrom(0.95, BENIGN_CHOICE, 3);
}

/** Complete, well-formed, and confidently adverse in every seat that can be. */
function maximallyAdverse(): SystemOneResponse {
  return responseFrom(0.0, ADVERSE_CHOICE, 0, 0.99);
}

const OPTS = { request: undefined as SystemOneRequest | undefined, state: STATE };

// ---------- contract.ts ----------

test("1 validateRequest accepts a legal body built from the seats", () => {
  assert.equal(validateRequest(legal()), null);
});

test("2 rejects jev-latest (wrong-model) — P1", () => {
  const r = legal();
  (r as { model: string }).model = "jev-latest";
  assert.equal(validateRequest(r)?.kind, "wrong-model");
});

test("3 rejects an empty questions map", () => {
  const r = legal();
  r.questions = {};
  assert.equal(validateRequest(r)?.kind, "empty-questions");
});

test("4 rejects blank instructions", () => {
  const r = legal();
  r.questions.gold_color!.instructions = "   ";
  assert.equal(validateRequest(r)?.kind, "missing-instructions");
});

test("5 rejects a Choice with 1 criterion", () => {
  const r = legal();
  r.questions.gold_color = { type: "choice", instructions: "x", criteria: { entity: "ok" } };
  assert.equal(validateRequest(r)?.kind, "choice-criteria");
});

test("6 Score level count: 1 and 11 rejected, 2 and 10 accepted", () => {
  const table = [[1, "score-level-count"], [11, "score-level-count"], [2, null], [10, null]] as const;
  for (const [n, expected] of table) {
    const r = legal();
    r.questions.proxy_fidelity = {
      type: "score",
      instructions: "x",
      criteria: Array.from({ length: n }, (_, i) => "level " + i),
    };
    assert.equal(validateRequest(r)?.kind ?? null, expected, "n=" + n);
  }
  assert.equal(SCORE_LEVEL_MIN, 2);
  assert.equal(SCORE_LEVEL_MAX, 10);
});

test("7 isMidBandNoul — 0.4 and 0.6 exclusive, 0.5 inclusive (G6)", () => {
  assert.equal(isMidBandNoul(0.4), false);
  assert.equal(isMidBandNoul(0.6), false);
  assert.equal(isMidBandNoul(0.5), true);
  assert.equal(isMidBandNoul(0.41), true);
  assert.equal(isMidBandNoul(0.59), true);
});

// ---------- from-seats.ts ----------

test("8 fromSeats emits one question per seat, every seat name present, ids round-trip", () => {
  const r = legal();
  const ids = Object.keys(r.questions);
  assert.equal(ids.length, SEATS.length);
  for (const seat of SEATS) assert.ok(ids.includes(SEAT_SPECS[seat].name), seat);
  for (const id of ids) assert.equal(SEAT_SPECS[seatOfQuestionId(id)!].name, id);
  assert.equal(seatOfQuestionId("judge"), undefined);
  assert.equal(seatOfQuestionId("verdict"), undefined);
});

test("9 fromSeats output passes validateRequest (the closed loop)", () => {
  const r = fromSeats(STATE);
  assert.ok(r.ok);
  assert.equal(validateRequest(r.value), null);
});

test("10 the Score seat emits 2–10 ordered standalone levels, worst first (G1)", () => {
  const q = legal().questions.proxy_fidelity!;
  assert.equal(q.type, "score");
  if (q.type !== "score") return;
  assert.ok(q.criteria.length >= SCORE_LEVEL_MIN && q.criteria.length <= SCORE_LEVEL_MAX);
  assert.deepEqual(q.criteria, SEAT_SPECS["domain-expert"].levels);
  for (const level of q.criteria) {
    assert.equal(typeof level, "string");
    assert.ok((level as string).length > 20, "levels are situations, not labels");
    assert.ok(!/[0-9]\s*(-|–|to)\s*[0-9]/.test(level as string), "never a numeric range");
  }
  // worst → best: the adverse level index is at the bottom of the ladder.
  const adv = SEAT_SPECS["domain-expert"].adverse;
  assert.equal(adv.kind, "score-at-or-below");
});

test("11 no Choice description is null or blank (G4)", () => {
  const r = legal();
  let choices = 0;
  for (const q of Object.values(r.questions)) {
    if (q.type !== "choice") continue;
    choices += 1;
    for (const [k, v] of Object.entries(q.criteria)) {
      assert.ok(typeof v === "string" && v.trim().length > 0, k);
    }
  }
  assert.equal(choices, SEATS.filter((s) => SEAT_SPECS[s].primitive === "choice").length);
  assert.ok(Object.keys(CHOICE_CRITERIA).length >= 3);
});

test("12 the emitted model is TYPESAFE_PINNED_MODEL, never a literal (G7)", () => {
  assert.equal(legal().model, TYPESAFE_PINNED_MODEL);
  assert.equal(SEAT_SPECS.colorist.name, "gold_color");
});

test("13 adversary offers the forbidden kinds plus a no-match, and never an allowed kind", () => {
  const keys = Object.keys((legal().questions.toxin_color as { criteria: object }).criteria);
  assert.deepEqual(keys.slice(0, -1).sort(), [...STATE.item.forbidden].sort());
  assert.equal(keys.at(-1), NO_TOXIN);
  for (const a of STATE.item.allowed) assert.ok(!keys.includes(a), a + " must not be offered");
  assert.deepEqual(criteriaKeysOf("adversary", STATE), keys);
  // with nothing forbidden there is no question to ask: fail closed, never emit it.
  const bad = fromSeats({ item: { ...STATE.item, forbidden: [] } });
  assert.ok(!bad.ok);
  assert.equal(bad.error.kind, "state-shape");
  assert.equal(Object.keys(toxinCriteria(["action"])).length, 2);
});

test("14 the prompts are self-contained: no undefined workbench vocabulary, no stale seats", () => {
  const dead = ["L0 contract", "DIGEST.md", "enterprise-temporal", "gold asset", "JEV lexicon"];
  for (const seat of SEATS) {
    const p = SEAT_SPECS[seat].prompt;
    for (const term of dead) {
      assert.ok(!p.includes(term), seat + " still leans on undefined vocabulary: " + term);
    }
    assert.ok(p.length > 120, seat + " prompt is too short to carry its own meaning");
    assert.ok(p.includes("`item.") || p.includes("these questions"), seat + " names no state path");
  }
  for (const gone of ["judge", "masker", "glue-checker", "fail-closed-gate", "calibration-steward"]) {
    assert.ok(!(SEATS as readonly string[]).includes(gone), gone + " must be deleted");
  }
});

test("15 the masker is code now: countMasks counts, and a bad mask count is refused", () => {
  assert.equal(countMasks("a [MASK] b"), 1);
  assert.equal(countMasks("a [MASK] b [MASK]"), 2);
  assert.equal(countMasks("nothing here"), 0);
  assert.equal(MASK_TOKEN, "[MASK]");
  for (const text of ["no mask at all", "two [MASK] and [MASK] here"]) {
    const r = fromSeats({ ...STATE, item: { ...STATE.item, text } });
    assert.ok(!r.ok, text);
    assert.equal(r.error.kind, "state-shape");
  }
});

// ---------- compose.ts ----------

test("16 meet is commutative, associative, idempotent, with GREEN as identity", () => {
  const V: Verdict[] = ["GREEN", "AMBER", "RED"];
  for (const a of V) {
    assert.equal(meet(a, a), a);
    assert.equal(meet("GREEN", a), a);
    assert.equal(meet(a, "RED"), "RED");
    for (const b of V) {
      assert.equal(meet(a, b), meet(b, a));
      for (const c of V) assert.equal(meet(meet(a, b), c), meet(a, meet(b, c)));
    }
  }
});

test("17 R6 — a confident adverse answer must not ship (the T48 regression)", () => {
  // Without R6 this response composes GREEN with no caps: every seat is present
  // (R3 clear) and no noul is mid-band (R5 clear). That was the 0.2.0 behaviour.
  const r = composeVerdict(score("GREEN"), maximallyAdverse(), OPTS);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.value.verdict, "RED");
  assert.ok(r.value.caps.some((c) => c.rule === "R6"), JSON.stringify(r.value.caps));
  assert.equal(r.value.model, "RED");

  // one seat at a time, from an otherwise benign response
  const one = benign();
  one.answers.restrictions_agree = noul(0.0);
  const r2 = composeVerdict(score("GREEN"), one, OPTS);
  assert.ok(r2.ok);
  assert.equal(r2.value.verdict, "RED");

  const two = benign();
  two.answers.locators_resolvable = noul(0.02);
  const r3 = composeVerdict(score("GREEN"), two, OPTS);
  assert.ok(r3.ok);
  assert.equal(r3.value.verdict, "AMBER");

  const three = benign();
  three.answers.proxy_fidelity = scoreAns(0);
  const r4 = composeVerdict(score("GREEN"), three, OPTS);
  assert.ok(r4.ok);
  assert.equal(r4.value.verdict, "AMBER");
});

test("18 being confidently adverse is never safer than being unsure (the inversion)", () => {
  for (const seat of LOAD_BEARING_SEATS) {
    const spec = SEAT_SPECS[seat];
    if (spec.primitive !== "noul") continue;
    const sure = benign();
    sure.answers[spec.name] = noul(0.0);
    const unsure = benign();
    unsure.answers[spec.name] = noul(0.5);
    const a = composeVerdict(score("GREEN"), sure, OPTS);
    const b = composeVerdict(score("GREEN"), unsure, OPTS);
    assert.ok(a.ok && b.ok);
    assert.ok(
      leq(a.value.verdict, b.value.verdict),
      spec.name + ": confident-no " + a.value.verdict + " > unsure " + b.value.verdict,
    );
  }
});

test("19 R5 — a mid-band noul on a load-bearing seat caps a local GREEN to AMBER (P5)", () => {
  const res = benign();
  res.answers.terms_defined_in_text = noul(0.5);
  const r = composeVerdict(score("GREEN"), res, OPTS);
  assert.ok(r.ok);
  assert.equal(r.value.verdict, "AMBER");
  assert.ok(r.value.caps.some((c) => c.rule === "R5" && c.seat === "lexicographer"));
  // and an advisory seat's mid-band noul changes nothing
  const adv = benign();
  adv.answers.harness_can_branch = noul(0.5);
  const r2 = composeVerdict(score("GREEN"), adv, OPTS);
  assert.ok(r2.ok);
  assert.equal(r2.value.verdict, "GREEN");
});

test("20 R3 — a missing load-bearing answer is RED, not GREEN", () => {
  for (const seat of LOAD_BEARING_SEATS) {
    const res = benign();
    delete res.answers[SEAT_SPECS[seat].name];
    const r = composeVerdict(score("GREEN"), res, OPTS);
    assert.ok(r.ok);
    assert.equal(r.value.verdict, "RED", seat);
  }
  // an absent advisory seat is not a refusal
  const res = benign();
  delete res.answers.toxin_color;
  const r = composeVerdict(score("GREEN"), res, OPTS);
  assert.ok(r.ok);
  assert.equal(r.value.verdict, "GREEN");
});

test("21 R1 — an unpinned res.model is refused, and err means do not ship", () => {
  const res = benign();
  res.model = "jev-latest";
  const r = composeVerdict(score("GREEN"), res, OPTS);
  assert.ok(!r.ok);
  assert.equal(r.error.kind, "wrong-model");
  assert.equal(verdictOf(r), "RED");
  assert.equal(verdictOf(composeVerdict(score("GREEN"), benign(), OPTS)), "GREEN");
});

test("22 R2 — wrong answer type, out-of-range noul, bad confidence are all refused", () => {
  const wrongType = benign();
  wrongType.answers.gold_color = noul(0.9) as unknown as ChoiceAnswer;
  assert.equal(composeVerdict(score("GREEN"), wrongType, OPTS).ok, false);

  for (const n of [2, -1, Number.NaN]) {
    const res = benign();
    res.answers.restrictions_agree = noul(n);
    const r = composeVerdict(score("GREEN"), res, OPTS);
    assert.ok(!r.ok, "noul " + n);
    assert.equal(r.error.kind, "noul-type");
  }
  const badConf = benign();
  badConf.answers.gold_color = choice("entity", Number.NaN);
  const rc = composeVerdict(score("GREEN"), badConf, OPTS);
  assert.ok(!rc.ok);
  assert.equal(rc.error.kind, "choice-type");

  const unknown = benign();
  unknown.answers.verdict = choice("RED");
  const ru = composeVerdict(score("GREEN"), unknown, OPTS);
  assert.ok(!ru.ok);
  assert.equal(ru.error.kind, "unknown-question");
});

test("23 R4 — a Choice outside its criteria is refused, not silently recorded", () => {
  for (const bad of ["Refuse", "refuse ", "RED", "MAYBE"]) {
    const res = benign();
    res.answers.split_leakage = choice(bad);
    const r = composeVerdict(score("GREEN"), res, OPTS);
    assert.ok(!r.ok, bad);
    assert.equal(r.error.kind, "choice-type");
  }
  // the advisory record is checked too: toxin_color's keys come from the state
  const res = benign();
  res.answers.toxin_color = choice("concept"); // permitted at this port, never offered
  const r = composeVerdict(score("GREEN"), res, OPTS);
  assert.ok(!r.ok);
  assert.equal(r.error.kind, "choice-type");
});

test("24 R7 — declared-cap coverage, and its inertness on the current table", () => {
  assert.equal(CONFIDENCE_FLOOR, 0.5);
  const res = benign();
  res.answers.split_leakage = choice("random_rows", 0.1);
  const r = composeVerdict(score("GREEN"), res, OPTS);
  assert.ok(r.ok);
  assert.equal(r.value.verdict, "RED");
  // R7 cannot lower below R6's cap while every declared cap is AMBER or RED.
  // If a seat ever declares a GREEN cap this assertion fails and R7 becomes live.
  for (const seat of SEATS) {
    const adv = SEAT_SPECS[seat].adverse;
    const caps = adv.kind === "choice" ? Object.values(adv.caps) : adv.kind === "none" ? [] : [adv.cap];
    for (const c of caps) assert.ok(leq(c, "AMBER"), seat + " declares a " + c + " cap");
  }
});

test("25 no rule raises: composed ≤ local over a fixed table of 60 pairs", () => {
  let seed = 20260923;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed / 0x7fffffff);
  const pick = (xs: readonly string[]): string => xs[Math.floor(rnd() * xs.length)]!;
  let checked = 0;
  let nonGreen = 0;
  for (let i = 0; i < 60; i++) {
    const local = score(pick(["GREEN", "AMBER", "RED"]) as Verdict);
    const res = benign();
    for (const seat of SEATS) {
      const spec = SEAT_SPECS[seat];
      if (rnd() < 0.12) { delete res.answers[spec.name]; continue; }
      if (spec.primitive === "noul") res.answers[spec.name] = noul(rnd());
      else if (spec.primitive === "score") res.answers[spec.name] = scoreAns(Math.floor(rnd() * 4), rnd());
      else {
        const keys = criteriaKeysOf(seat, STATE)!;
        res.answers[spec.name] = choice(pick(keys), rnd());
      }
    }
    const r = composeVerdict(local, res, OPTS);
    assert.ok(r.ok, JSON.stringify(r));
    assert.ok(leq(r.value.verdict, local.verdict), "pair " + i + ": " + r.value.verdict + " > " + local.verdict);
    if (r.value.verdict !== local.verdict) nonGreen += 1;
    checked += 1;
  }
  assert.equal(checked, 60);
  // D2, the must-cap half. The one-sided bound alone is satisfied by a constant-RED
  // implementation and by one that ignores the response. The exact expectations below
  // fail both: constant-RED fails the two rows that must stay where they are, and an
  // identity implementation fails every row that must be lowered.
  const mustCap: Array<[Verdict, (r: SystemOneResponse) => void, Verdict]> = [
    ["GREEN", () => {}, "GREEN"],
    ["RED", () => {}, "RED"],
    ["GREEN", (r) => void (r.answers.restrictions_agree = noul(0.0)), "RED"],
    ["GREEN", (r) => void (r.answers.terms_defined_in_text = noul(0.5)), "AMBER"],
    ["GREEN", (r) => void (r.answers.proxy_fidelity = scoreAns(0)), "AMBER"],
    ["GREEN", (r) => void delete r.answers.gold_color, "RED"],
    ["AMBER", (r) => void (r.answers.split_leakage = choice("random_rows")), "RED"],
    ["AMBER", (r) => void (r.answers.locators_resolvable = noul(0.1)), "AMBER"],
  ];
  for (const [localVerdict, mutate, expected] of mustCap) {
    const res = benign();
    mutate(res);
    const r = composeVerdict(score(localVerdict), res, OPTS);
    assert.ok(r.ok);
    assert.equal(r.value.verdict, expected, localVerdict + " -> " + r.value.verdict);
  }
  assert.ok(nonGreen > 10, "only " + nonGreen + " of 60 pairs were lowered at all");
});

test("26 the load-bearing option may widen but never narrow or empty the default", () => {
  assert.deepEqual([...DEFAULT_LOAD_BEARING], [...LOAD_BEARING_SEATS]);
  assert.ok(DEFAULT_LOAD_BEARING.length >= 6);
  const narrow = composeVerdict(score("GREEN"), benign(), {
    ...OPTS,
    loadBearing: ["lexicographer"] as Seat[],
  });
  assert.ok(!narrow.ok);
  assert.equal(narrow.error.kind, "load-bearing-set");

  const empty = composeVerdict(score("GREEN"), benign(), { ...OPTS, loadBearing: [] });
  assert.ok(!empty.ok);
  assert.equal(empty.error.kind, "load-bearing-set");

  const wide = composeVerdict(score("GREEN"), benign(), {
    ...OPTS,
    loadBearing: [...DEFAULT_LOAD_BEARING, "harness-teacher"] as Seat[],
  });
  assert.ok(wide.ok);
});

test("27 advisory seats are recorded and consumed by no rule", () => {
  const res = benign();
  res.answers.toxin_color = choice("action", 0.99);
  res.answers.primitive = choice("noul");
  res.answers.harness_can_branch = noul(0.01);
  const r = composeVerdict(score("GREEN"), res, OPTS);
  assert.ok(r.ok);
  assert.equal(r.value.verdict, "GREEN");
  assert.equal(r.value.caps.length, 0);
  assert.equal(r.value.advisories.toxin_color, "choice action");
  assert.equal(r.value.advisories.harness_can_branch, "noul 0.01");
  assert.equal(r.value.advisories.gold_color, undefined);
});

test("28 P4 — no answer, of any primitive, can raise a local RED", () => {
  const r = composeVerdict(score("RED"), benign(), OPTS);
  assert.ok(r.ok);
  assert.equal(r.value.verdict, "RED");
  assert.equal(r.value.model, "GREEN");
  assert.equal(r.value.local.verdict, "RED");
});
