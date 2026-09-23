import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyLocal } from "./lexicon.ts";
import { CORPUS } from "./corpus.ts";
import { scoreFill } from "./score.ts";
import { COLORS, type Color } from "./colors.ts";
import type { Dist } from "./score.ts";

const argmax = (d: Dist): Color =>
  (Object.entries(d) as Array<[Color, number]>).sort((a, b) => b[1] - a[1])[0][0];
const mass = (d: Dist): number => COLORS.reduce((s, c) => s + d[c], 0);

/**
 * "No signal" has two shapes here, and both mean the same thing: no kind is
 * preferred. A token that survives tokenization but matches nothing still
 * receives the uniform 0.04 prior, so its mass normalizes to 0.2 per colour;
 * an input whose every token is filtered out returns early with all zeros.
 */
const flat = (d: Dist): boolean => {
  const vs = COLORS.map((c) => d[c]);
  return Math.max(...vs) - Math.min(...vs) < 1e-9;
};

test("a bracketed placeholder is the slot, not its content", () => {
  // Regression: "[MASK]" tokenized to "mask", a real entry in the action
  // lexicon, so the marker itself scored action 0.87.
  assert.equal(mass(classifyLocal("[MASK]")), 0);
  const withMarker = classifyLocal("The warehouse [MASK] holds the terminals table.");
  const without = classifyLocal("The warehouse holds the terminals table.");
  assert.deepEqual(withMarker, without, "the marker must not change the distribution");
});

test("a function word claims no kind", () => {
  // Regression: the matcher accepted w.startsWith(t), so "the" matched
  // "theory" and put 0.93 of an ordinary sentence's mass on idea.
  for (const w of ["the", "and", "that", "is", "not"]) {
    assert.ok(flat(classifyLocal(w)), w + " should prefer no kind");
  }
});

test("no prefix of a lexicon word claims that word", () => {
  // "co" must not match color / compose / cospan / count; "sc" must not match
  // schema / schedule / score / screenshot.
  for (const w of ["co", "sc", "ma", "pu", "ty"]) {
    assert.ok(flat(classifyLocal(w)), w + " must not match by prefix");
  }
});

test("an exact lexicon word and its simple inflections still match", () => {
  assert.equal(argmax(classifyLocal("publish the report")), "action");
  assert.equal(argmax(classifyLocal("published")), "action");
  assert.equal(argmax(classifyLocal("the terminals")), "entity");
  assert.equal(argmax(classifyLocal("a hypothesis")), "idea");
});

test("no signal fails closed rather than answering confidently", () => {
  // Before, a stopword-only input returned idea 0.93 — a confident wrong
  // answer. Now it carries no mass, and scoreFill refuses.
  const d = classifyLocal("the and that");
  assert.equal(mass(d), 0);
  assert.equal(scoreFill(d, ["concept"], ["action"]).verdict, "RED");
});

test("the corpus is no longer refused wholesale", () => {
  // Before this fix the local seed returned RED on 7 of the repo's own 8
  // fixtures, for reasons unrelated to the items. A gate that refuses
  // everything is fail-closed and useless; see docs/EVALUATION.md.
  const reds = CORPUS.filter((it) => {
    const d = classifyLocal(it.text);
    return scoreFill(d, it.allowed, it.forbidden).verdict === "RED";
  }).length;
  assert.ok(reds <= 3, "expected at most 3 REDs over 8 clean fixtures, got " + reds);
});
