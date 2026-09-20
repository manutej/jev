import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPort, compose, openSlots } from "./operad.ts";
import { seedForest } from "./doctrines.ts";
import { brier, scoreFill } from "./score.ts";
import { classifyLocal } from "./lexicon.ts";

test("open slots are typed", () => {
  const f = seedForest();
  const slots = openSlots(f);
  assert.ok(slots.length >= 2);
  for (const s of slots) assert.ok(["entity", "concept", "idea", "evidence", "action"].includes(s.color));
});

test("color mismatch refuses composition", () => {
  const f = seedForest();
  const err = checkPort(f, "n-gate", 0, "n-e1");
  assert.ok(err);
  assert.equal(err?.kind, "color-mismatch");
});

test("matching leaf composes", () => {
  const f = seedForest();
  const leaf = "n-new";
  const forest = {
    ...f,
    nodes: {
      ...f.nodes,
      [leaf]: { id: leaf, op: "compose-maps", children: [null, null] },
    },
  };
  const result = compose(forest, "n-iface", 0, leaf);
  assert.equal(result.ok, true);
});

test("JEV fail-closed on toxin", () => {
  const s = scoreFill(
    { entity: 0.1, concept: 0.1, idea: 0.1, evidence: 0.1, action: 0.6 },
    ["evidence"],
    ["action"],
  );
  assert.equal(s.verdict, "RED");
});

test("local classifier prefers action on publish", () => {
  const d = classifyLocal("publish the workflow after naming the inverse");
  assert.ok(d.action > d.entity);
});

test("brier is zero on peaked gold", () => {
  assert.equal(brier({ entity: 1, concept: 0, idea: 0, evidence: 0, action: 0 }, "entity"), 0);
});
