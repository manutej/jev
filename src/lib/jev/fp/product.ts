import type { System } from "./cospan.ts";

/** A × B. No identified color. Dual to glue and share. */
export type Product = {
  readonly system: System;
};

/** Discrete cartesian product — twin of Rust `product_ports`. Never fails on color. */
export function product(left: System, right: System): Product {
  return {
    system: {
      id: `${left.id}×${right.id}`,
      name: `${left.name} × ${right.name}`,
      ports: [...left.ports, ...right.ports],
    },
  };
}
