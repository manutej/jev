import { COLORS, type Color, isColor } from "./colors.ts";

/**
 * A colored operad in the sense of Yau / Libkind–Myers applied:
 * operations have an output color and an input profile (tuple of colors).
 * Composition γ is defined only when colors match — that is type safety.
 *
 * Trees are free processes in a doctrine (arXiv:2505.18329 §8).
 */

export type OpId = string;
export type NodeId = string;

export interface Operation {
  id: OpId;
  name: string;
  output: Color;
  inputs: Color[];
  doctrine: DoctrineKind;
  note?: string;
}

export type DoctrineKind = "port-plugging" | "variable-sharing" | "moore";

export interface TreeNode {
  id: NodeId;
  op: OpId;
  /** children[i] occupies input port i; null = open (maskable) slot */
  children: Array<NodeId | null>;
}

export interface Operad {
  operations: Record<OpId, Operation>;
}

export interface Forest {
  operad: Operad;
  nodes: Record<NodeId, TreeNode>;
  root: NodeId;
}

export interface ComposeError {
  kind: "arity" | "color-mismatch" | "missing-op" | "cycle" | "unknown-node";
  message: string;
  port?: number;
  expected?: Color;
  actual?: Color;
}

export function colorOf(forest: Forest, nodeId: NodeId): Color | null {
  const node = forest.nodes[nodeId];
  if (!node) return null;
  return forest.operad.operations[node.op]?.output ?? null;
}

export function checkPort(
  forest: Forest,
  parentId: NodeId,
  port: number,
  childId: NodeId,
): ComposeError | null {
  const parent = forest.nodes[parentId];
  const child = forest.nodes[childId];
  if (!parent) return { kind: "unknown-node", message: `Unknown parent ${parentId}` };
  if (!child) return { kind: "unknown-node", message: `Unknown child ${childId}` };
  const pop = forest.operad.operations[parent.op];
  const cop = forest.operad.operations[child.op];
  if (!pop || !cop) return { kind: "missing-op", message: "Missing operation" };
  if (port < 0 || port >= pop.inputs.length) {
    return { kind: "arity", message: `Port ${port} out of arity ${pop.inputs.length}`, port };
  }
  const expected = pop.inputs[port];
  const actual = cop.output;
  if (expected !== actual) {
    return {
      kind: "color-mismatch",
      message: `Port ${port} wants ${expected}, child outputs ${actual}`,
      port,
      expected,
      actual,
    };
  }
  return null;
}

function wouldCycle(forest: Forest, parentId: NodeId, childId: NodeId): boolean {
  const seen = new Set<NodeId>();
  const stack = [childId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === parentId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = forest.nodes[id];
    if (!node) continue;
    for (const c of node.children) if (c) stack.push(c);
  }
  return false;
}

/** γ — plug child into parent at port. Returns a new forest or an error. */
export function compose(
  forest: Forest,
  parentId: NodeId,
  port: number,
  childId: NodeId,
): { ok: true; forest: Forest } | { ok: false; error: ComposeError } {
  if (wouldCycle(forest, parentId, childId)) {
    return { ok: false, error: { kind: "cycle", message: "Composition would cycle" } };
  }
  const err = checkPort(forest, parentId, port, childId);
  if (err) return { ok: false, error: err };
  const parent = forest.nodes[parentId];
  const nextChildren = parent.children.slice();
  nextChildren[port] = childId;
  return {
    ok: true,
    forest: {
      ...forest,
      nodes: {
        ...forest.nodes,
        [parentId]: { ...parent, children: nextChildren },
      },
    },
  };
}

export function unplug(forest: Forest, parentId: NodeId, port: number): Forest {
  const parent = forest.nodes[parentId];
  if (!parent) return forest;
  const next = parent.children.slice();
  if (port < 0 || port >= next.length) return forest;
  next[port] = null;
  return {
    ...forest,
    nodes: { ...forest.nodes, [parentId]: { ...parent, children: next } },
  };
}

export function openSlots(forest: Forest): Array<{ nodeId: NodeId; port: number; color: Color }> {
  const out: Array<{ nodeId: NodeId; port: number; color: Color }> = [];
  for (const node of Object.values(forest.nodes)) {
    const op = forest.operad.operations[node.op];
    if (!op) continue;
    node.children.forEach((child, port) => {
      if (child === null) out.push({ nodeId: node.id, port, color: op.inputs[port]! });
    });
  }
  return out;
}

export function parseColorProfile(raw: string): Color[] | null {
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  if (!parts.every(isColor)) return null;
  return parts as Color[];
}

export { COLORS, isColor };
