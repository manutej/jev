import { COLORS, type Color } from "./colors.ts";
import { emptyDist, normalize, type Dist } from "./score.ts";

/** Prototype lexicon for the local (no-API) masked simulator. */

const LEX: Record<Color, string[]> = {
  entity: [
    "terminal",
    "warehouse",
    "table",
    "token",
    "map",
    "layer",
    "person",
    "place",
    "port",
    "node",
    "species",
    "machine",
    "dataset",
    "schema",
    "city",
    "truck",
    "depot",
  ],
  concept: [
    "type",
    "interface",
    "module",
    "doctrine",
    "operad",
    "color",
    "catchment",
    "hotspot",
    "system",
    "interaction",
    "profile",
    "arity",
    "category",
    "wiring",
    "cospan",
    "lens",
  ],
  idea: [
    "hypothesis",
    "claim",
    "theory",
    "conjecture",
    "thesis",
    "model",
    "proposal",
    "belief",
    "guess",
    "story",
  ],
  evidence: [
    "query",
    "count",
    "extent",
    "crs",
    "screenshot",
    "ocr",
    "catalog",
    "row",
    "tile",
    "logprob",
    "measurement",
    "trace",
    "history",
    "brier",
  ],
  action: [
    "publish",
    "compose",
    "drop",
    "grant",
    "schedule",
    "transfer",
    "unplug",
    "mask",
    "simulate",
    "score",
    "ship",
    "rollback",
  ],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

export function classifyLocal(text: string): Dist {
  const tokens = tokenize(text);
  const dist = emptyDist();
  if (tokens.length === 0) return dist;
  for (const c of COLORS) {
    const bag = LEX[c];
    let hits = 0;
    for (const t of tokens) {
      for (const w of bag) {
        if (t === w || t.startsWith(w) || w.startsWith(t)) hits += 1;
      }
    }
    dist[c] = hits;
  }
  // tiny uniform prior so zeros don't collapse
  for (const c of COLORS) dist[c] += 0.04;
  return normalize(dist);
}
