import type { Color } from "./colors.ts";

export interface MaskItem {
  id: string;
  text: string;
  /** the [MASK] span's gold color */
  gold: Color;
  allowed: Color[];
  forbidden: Color[];
  note: string;
}

/**
 * Real-shaped claims for type-safety experiments.
 * Each item has one [MASK] whose gold color is the operad port we expect.
 */
export const CORPUS: MaskItem[] = [
  {
    id: "c1",
    text: "The warehouse [MASK] holds the terminals table.",
    gold: "entity",
    allowed: ["entity"],
    forbidden: ["action", "idea"],
    note: "A named store of things is an entity.",
  },
  {
    id: "c2",
    text: "Glue the two open Petri nets along a [MASK] of species.",
    gold: "concept",
    allowed: ["concept", "entity"],
    forbidden: ["action"],
    note: "Cospan / interface — a concept of interaction.",
  },
  {
    id: "c3",
    text: "Before we [MASK] the workflow, name the inverse command.",
    gold: "action",
    allowed: ["action"],
    forbidden: ["evidence"],
    note: "Publish/schedule is an irreversible-ish action.",
  },
  {
    id: "c4",
    text: "Row count and CRS check are the [MASK] that a map is not proof.",
    gold: "evidence",
    allowed: ["evidence"],
    forbidden: ["idea", "action"],
    note: "Independent channel — evidence, not a story.",
  },
  {
    id: "c5",
    text: "Libkind–Myers treat diagrammatic patterns as free [MASK] in a doctrine.",
    gold: "concept",
    allowed: ["concept"],
    forbidden: ["entity"],
    note: "Processes / interactions are conceptual structure.",
  },
  {
    id: "c6",
    text: "The [MASK] that catchment equals demand is still untested.",
    gold: "idea",
    allowed: ["idea", "concept"],
    forbidden: ["evidence", "action"],
    note: "A hypothesis until scored.",
  },
  {
    id: "c7",
    text: "Do not [MASK] the schema; drop only the table this run created.",
    gold: "action",
    allowed: ["action"],
    forbidden: ["entity"],
    note: "DROP is an action with high blast.",
  },
  {
    id: "c8",
    text: "A Moore machine's [MASK] is the lens from state to output.",
    gold: "concept",
    allowed: ["concept", "entity"],
    forbidden: ["action"],
    note: "Readout is a typed interface, not a thing in the world.",
  },
];
