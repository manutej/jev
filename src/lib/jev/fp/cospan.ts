import type { Color } from "../colors.ts";
import { err, ok, type Result } from "./result.ts";

export type Port = { readonly id: string; readonly color: Color; readonly label: string };
export type System = { readonly id: string; readonly name: string; readonly ports: readonly Port[] };

export type GlueError = { readonly kind: "color-mismatch"; readonly color: Color };

/** A → I ← B. Apex I is the glued color. */
export type Cospan = {
  readonly left: System;
  readonly right: System;
  readonly apex: Color;
  readonly leftIndex: number;
  readonly rightIndex: number;
};

/** Pushout of the cospan: leftover outer ports, identified glue remembered. */
export type Pushout = {
  readonly system: System;
  readonly identified: Color;
};

export function encodePorts(ports: readonly Port[]): number[] {
  const order: Color[] = ["entity", "concept", "idea", "evidence", "action"];
  return ports.map((p) => order.indexOf(p.color));
}

export function cospanOf(left: System, right: System, color: Color): Result<Cospan, GlueError> {
  const leftIndex = left.ports.findIndex((p) => p.color === color);
  const rightIndex = right.ports.findIndex((p) => p.color === color);
  if (leftIndex < 0 || rightIndex < 0) return err({ kind: "color-mismatch", color });
  return ok({ left, right, apex: color, leftIndex, rightIndex });
}

/** Discrete pushout — twin of Rust `pushout_ports`. */
export function pushout(c: Cospan): Pushout {
  const rest = [...c.left.ports.filter((_, i) => i !== c.leftIndex), ...c.right.ports.filter((_, i) => i !== c.rightIndex)];
  return {
    identified: c.apex,
    system: {
      id: `${c.left.id}+${c.right.id}`,
      name: `${c.left.name} ⋈ ${c.right.name}`,
      ports: rest,
    },
  };
}

export function glue(left: System, right: System, color: Color): Result<Pushout, GlueError> {
  const c = cospanOf(left, right, color);
  return c.ok ? ok(pushout(c.value)) : c;
}
