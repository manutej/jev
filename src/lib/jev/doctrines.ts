import type { Color } from "./colors.ts";
import type { DoctrineKind, Forest, Operad, Operation } from "./operad.ts";

function op(
  id: string,
  name: string,
  output: Color,
  inputs: Color[],
  doctrine: DoctrineKind,
  note?: string,
): Operation {
  return { id, name, output, inputs, doctrine, note };
}

/**
 * Applied doctrines from Libkind–Myers 2025:
 * port-plugging (cospan / pushout), variable-sharing (span / pullback),
 * generalized Moore machines (lenses).
 * Product is juxtaposition with no identified color — not a fourth doctrine.
 */
export function makeOperad(): Operad {
  const operations: Record<string, Operation> = {};
  const add = (o: Operation) => {
    operations[o.id] = o;
  };

  add(op("name-entity", "Name entity", "entity", [], "port-plugging", "Leaf: a typed thing"));
  add(op("state-var", "State variable", "entity", [], "variable-sharing"));
  add(op("readout", "Readout", "evidence", ["entity"], "moore", "Moore readout lens"));
  add(
    op("update", "Update", "entity", ["entity", "action"], "moore", "State × input → next state"),
  );
  add(op("observe", "Observe", "evidence", ["entity", "concept"], "port-plugging"));
  add(op("claim", "Claim", "idea", ["concept", "evidence"], "port-plugging"));
  add(op("gate", "JEV gate", "action", ["idea", "evidence"], "port-plugging", "Fail-closed ship"));
  add(op("share", "Share variable", "entity", ["entity", "entity"], "variable-sharing", "Pullback"));
  add(op("product", "Product systems", "entity", ["entity", "entity"], "variable-sharing", "Cartesian product — no identified color"));
  add(op("plug", "Plug ports", "concept", ["entity", "entity"], "port-plugging", "Pushout / cospan"));
  add(op("compose-maps", "Compose maps", "concept", ["concept", "concept"], "port-plugging"));
  add(op("simulate", "Simulate fill", "evidence", ["idea", "concept"], "moore"));
  add(op("score", "Score fill", "action", ["evidence", "concept"], "moore"));

  return { operations };
}

export function seedForest(): Forest {
  const operad = makeOperad();
  return {
    operad,
    root: "n-gate",
    nodes: {
      "n-gate": { id: "n-gate", op: "gate", children: ["n-claim", "n-sim"] },
      "n-claim": { id: "n-claim", op: "claim", children: ["n-plug", "n-obs"] },
      "n-plug": { id: "n-plug", op: "plug", children: ["n-e1", "n-e2"] },
      "n-e1": { id: "n-e1", op: "name-entity", children: [] },
      "n-e2": { id: "n-e2", op: "name-entity", children: [] },
      "n-obs": { id: "n-obs", op: "observe", children: ["n-state", "n-iface"] },
      "n-state": { id: "n-state", op: "state-var", children: [] },
      "n-iface": { id: "n-iface", op: "compose-maps", children: [null, null] },
      "n-sim": { id: "n-sim", op: "simulate", children: [null, null] },
    },
  };
}

export const DOCTRINE_COPY: Record<DoctrineKind, { title: string; body: string }> = {
  "port-plugging": {
    title: "Port-plugging",
    body: "Cospan doctrine. Glue systems at ports by pushout. Wiring diagrams are free processes.",
  },
  "variable-sharing": {
    title: "Variable sharing",
    body: "Span doctrine. Identify state along a pullback — the same variable, two views. Product is the no-interaction case: juxtapose, identify nothing.",
  },
  moore: {
    title: "Moore machines",
    body: "Systems as lenses: readout forward, update backward. Trajectories are system maps.",
  },
};
