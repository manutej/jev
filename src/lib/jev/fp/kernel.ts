/**
 * Functional kernel. Pure in, Result out. No store, no fetch, no time.
 *
 * When WASM is loaded, Rust runs first (source of truth) and the TS twin
 * must agree. Otherwise TS alone. The two implement the same discrete
 * pushout / pullback / product of colored ports.
 */

import type { Color } from "../colors.ts";
import { compose as composeTree, type Forest, type NodeId } from "../operad.ts";
import { scoreFill, type Dist, type JevScore, type Thresholds } from "../score.ts";
import { encodePorts, glue as glueTs, type GlueError, type Pushout, type System } from "./cospan.ts";
import { product as productTs, type Product } from "./product.ts";
import { share as shareTs, type Pullback } from "./span.ts";
import { currentBackend, rustProduct, rustPullback, rustPushout, rustReady, type Backend } from "./rust.ts";
import { err, type Result } from "./result.ts";

const COLORS: Color[] = ["entity", "concept", "idea", "evidence", "action"];

function colorIndex(c: Color): number {
  return COLORS.indexOf(c);
}

function agrees(codes: number[], tsColors: Color[]): boolean {
  if (codes.length !== tsColors.length) return false;
  return codes.every((n, i) => COLORS[n] === tsColors[i]);
}

export function glue(left: System, right: System, color: Color): Result<Pushout, GlueError> {
  const ts = glueTs(left, right, color);
  if (!rustReady()) return ts;
  const codes = rustPushout(encodePorts(left.ports), encodePorts(right.ports), colorIndex(color));
  if (!codes || !ts.ok) return err({ kind: "color-mismatch", color });
  if (!agrees(codes, ts.value.system.ports.map((p) => p.color))) {
    return err({ kind: "color-mismatch", color });
  }
  return ts;
}

export function share(left: System, right: System, color: Color): Result<Pullback, GlueError> {
  const ts = shareTs(left, right, color);
  if (!rustReady()) return ts;
  const codes = rustPullback(encodePorts(left.ports), encodePorts(right.ports), colorIndex(color));
  if (!codes || !ts.ok) return err({ kind: "color-mismatch", color });
  return ts;
}

/** Juxtaposition. Never a color-mismatch. Old WASM without jev_product is ignored. */
export function product(left: System, right: System): Product {
  const ts = productTs(left, right);
  if (!rustReady()) return ts;
  const codes = rustProduct(encodePorts(left.ports), encodePorts(right.ports));
  if (!codes) return ts;
  return ts;
}

export function composeOperad(forest: Forest, parentId: NodeId, port: number, childId: NodeId) {
  return composeTree(forest, parentId, port, childId);
}

export function score(dist: Dist, allowed: Color[], forbidden: Color[], tau: Thresholds): JevScore {
  return scoreFill(dist, allowed, forbidden, tau);
}

export function backend(): Backend {
  return currentBackend();
}

export type { Backend, Product };
