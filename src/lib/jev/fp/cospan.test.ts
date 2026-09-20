import assert from "node:assert/strict";
import { test } from "node:test";
import { glue } from "./cospan.ts";
import { share } from "./span.ts";
import { CATCHMENT, TERMINALS, VIEW_A, VIEW_B } from "./systems.ts";

test("cospan pushout glues matching entity", () => {
  const r = glue(CATCHMENT, TERMINALS, "entity");
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const colors = r.value.system.ports.map((p) => p.color);
  assert.deepEqual(colors, ["evidence", "idea", "concept", "action"]);
  assert.equal(r.value.identified, "entity");
});

test("cospan refuses a color that is not on both feet", () => {
  const r = glue(CATCHMENT, TERMINALS, "action");
  assert.equal(r.ok, false);
});

test("span pullback identifies the shared entity", () => {
  const r = share(VIEW_A, VIEW_B, "entity");
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.color, "entity");
});
