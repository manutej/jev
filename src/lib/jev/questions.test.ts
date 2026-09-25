import assert from "node:assert/strict";
import { test } from "node:test";
import { CONCEPTS } from "./concepts.ts";
import { generateAll, generateQuestions } from "./questions.ts";
import { SEATS, buildFillQuery } from "./seats.ts";
import { scoreFill } from "./score.ts";
import { CLAIMS } from "./eval/claims.ts";
import { CORPUS } from "./corpus.ts";

test("E11 each concept emits 100 questions", () => {
  for (const c of CONCEPTS) {
    assert.equal(generateQuestions(c.id).length, 100, c.id);
  }
});

test("E2 gold is in allowed and E3 disjoint from forbidden", () => {
  for (const q of generateAll()) {
    assert.ok(q.allowed.includes(q.gold), q.id);
    assert.equal(q.allowed.filter((x) => q.forbidden.includes(x)).length, 0, q.id);
  }
});

test("E4 primitive is typed", () => {
  for (const q of generateAll()) {
    assert.ok(["noul", "choice", "score"].includes(q.primitive), q.id);
  }
});

test("E8 fill query has 16 seats and pins jev-1.13.0", () => {
  const q = buildFillQuery({ id: "fixture" });
  assert.equal(q.model, "jev-1.13.0");
  assert.equal(q.questions.length, 16);
  assert.deepEqual(q.questions.map((x) => x.seat), [...SEATS]);
});

test("E5 no arithmetic or date-compare asks", () => {
  const banned = /\b(add the|sum the|count the|how many rows|subtract|multiply|days between)\b/i;
  for (const q of generateAll()) {
    assert.equal(banned.test(q.text), false, q.id);
  }
});

test("E1 toxin fill on c7 is RED", () => {
  const item = CORPUS.find((c) => c.id === "c7");
  assert.ok(item);
  // c7 forbids `entity` (its gold and only allowed color is `action`), so the toxin mass goes on `entity`.
  assert.ok(item!.forbidden.includes("entity"));
  const s = scoreFill(
    { entity: 0.8, concept: 0.05, idea: 0.05, evidence: 0.05, action: 0.05 },
    item!.allowed,
    item!.forbidden,
  );
  assert.equal(s.verdict, "RED");
  assert.ok(s.toxinMass > 0.12, "RED must come from the toxin rule, not low allowed mass");
  assert.match(s.reasons[0]!, /^Toxin mass/);
});

test("E7 mid-band allowed mass is AMBER not GREEN", () => {
  const s = scoreFill(
    { entity: 0.1, concept: 0.55, idea: 0.15, evidence: 0.1, action: 0.1 },
    ["concept"],
    ["action"],
  );
  assert.equal(s.verdict, "AMBER");
});

test("E12 enterprise metrics are not bare accuracy", () => {
  for (const c of CONCEPTS) {
    assert.notEqual(c.metric.trim().toLowerCase(), "accuracy", c.id);
    assert.ok(c.metric.length > 0, c.id);
  }
});

test("E14 every generated item has a toxin color", () => {
  for (const q of generateAll()) {
    assert.ok(q.forbidden.includes(q.toxin), q.id);
  }
});

test("E18 claims pack is 18 falsifiable rows", () => {
  assert.equal(CLAIMS.length, 18);
  assert.deepEqual(CLAIMS.map((c) => c.id), CLAIMS.map((c) => c.id).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
});
