import assert from "node:assert/strict";
import { test } from "node:test";
import { glue } from "./cospan.ts";
import { product } from "./product.ts";
import { share } from "./span.ts";
import { CATCHMENT, TERMINALS, VIEW_A, VIEW_B } from "./systems.ts";

test("product concatenates ports and identifies nothing", () => {
  const p = product(CATCHMENT, TERMINALS);
  const colors = p.system.ports.map((port) => port.color);
  assert.deepEqual(colors, ["entity", "evidence", "idea", "entity", "concept", "action"]);
  assert.equal(p.system.id, "catchment×terminals");
});

test("product is not glue and not share", () => {
  const p = product(VIEW_A, VIEW_B);
  const g = glue(VIEW_A, VIEW_B, "entity");
  const s = share(VIEW_A, VIEW_B, "entity");
  assert.equal(g.ok, true);
  assert.equal(s.ok, true);
  if (!g.ok) return;
  assert.notDeepEqual(
    p.system.ports.map((port) => port.color),
    g.value.system.ports.map((port) => port.color),
  );
  assert.equal(p.system.ports.length, VIEW_A.ports.length + VIEW_B.ports.length);
});

test("product never color-mismatches", () => {
  const p = product(CATCHMENT, VIEW_B);
  assert.equal(p.system.ports.length, CATCHMENT.ports.length + VIEW_B.ports.length);
});
