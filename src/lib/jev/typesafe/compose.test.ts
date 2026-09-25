import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreFill } from "../score.ts";
import { composeVerdict } from "./compose.ts";

const green = () =>
  scoreFill({ entity: 0.02, concept: 0.9, idea: 0.03, evidence: 0.03, action: 0.02 }, ["concept"], ["action"]);
const red = () =>
  scoreFill({ entity: 0.8, concept: 0.05, idea: 0.05, evidence: 0.05, action: 0.05 }, ["action"], ["entity"]);

test("mid-band noul on a load-bearing seat demotes GREEN to AMBER", () => {
  assert.equal(green().verdict, "GREEN");
  const out = composeVerdict({ local: green(), loadBearing: { harness_can_branch: { type: "noul", noul: 0.52 } } });
  assert.equal(out.verdict, "AMBER");
  assert.ok(out.reasons.some((r) => r.includes("harness_can_branch")));
  // Outside the band the local GREEN stands.
  const clear = composeVerdict({ local: green(), loadBearing: { harness_can_branch: { type: "noul", noul: 0.91 } } });
  assert.equal(clear.verdict, "GREEN");
});

test("a judge Choice cannot override a local RED", () => {
  assert.equal(red().verdict, "RED");
  const out = composeVerdict({
    local: red(),
    judge: { type: "choice", choice: "compose", probabilities: { compose: 0.97, escalate: 0.02, refuse: 0.01 }, confidence: 0.97 },
  });
  assert.equal(out.verdict, "RED");
  assert.ok(out.reasons.some((r) => r.includes("local RED is final")));
});
