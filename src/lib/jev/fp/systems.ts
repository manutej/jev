import type { Color } from "../colors.ts";
import type { System } from "./cospan.ts";

function ports(id: string, pairs: Array<[Color, string]>): System["ports"] {
  return pairs.map(([color, label], i) => ({ id: `${id}:${i}`, color, label }));
}

/** Real-shaped feet for the live cospan. */
export const CATCHMENT: System = {
  id: "catchment",
  name: "Catchment",
  ports: ports("catchment", [
    ["entity", "warehouse"],
    ["evidence", "row count"],
    ["idea", "demand story"],
  ]),
};

export const TERMINALS: System = {
  id: "terminals",
  name: "Terminals",
  ports: ports("terminals", [
    ["entity", "table"],
    ["concept", "schema"],
    ["action", "publish"],
  ]),
};

export const VIEW_A: System = {
  id: "view-a",
  name: "View A",
  ports: ports("view-a", [
    ["entity", "token"],
    ["evidence", "extent"],
  ]),
};

export const VIEW_B: System = {
  id: "view-b",
  name: "View B",
  ports: ports("view-b", [
    ["entity", "token"],
    ["concept", "layer"],
  ]),
};
