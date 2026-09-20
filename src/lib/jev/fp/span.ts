import type { Color } from "../colors.ts";
import { err, ok, type Result } from "./result.ts";
import type { GlueError, System } from "./cospan.ts";

/** A ← S → B. Nadir S is the shared variable. */
export type Span = {
  readonly left: System;
  readonly right: System;
  readonly nadir: Color;
};

export type Pullback = {
  readonly color: Color;
  readonly name: string;
};

export function spanOf(left: System, right: System, color: Color): Result<Span, GlueError> {
  const hasL = left.ports.some((p) => p.color === color);
  const hasR = right.ports.some((p) => p.color === color);
  if (!hasL || !hasR) return err({ kind: "color-mismatch", color });
  return ok({ left, right, nadir: color });
}

/** Discrete pullback — twin of Rust `pullback_ports`. */
export function pullback(s: Span): Pullback {
  return { color: s.nadir, name: `${s.left.name} ∩ ${s.right.name}` };
}

export function share(left: System, right: System, color: Color): Result<Pullback, GlueError> {
  const s = spanOf(left, right, color);
  return s.ok ? ok(pullback(s.value)) : s;
}
