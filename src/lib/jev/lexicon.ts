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

/**
 * Function words carry no kind. Without this list they match lexicon entries
 * by prefix — "the" matched "theory", putting 0.93 of an ordinary English
 * sentence's mass on `idea`.
 */
const STOPWORDS = new Set([
  "the", "and", "are", "but", "for", "not", "was", "were", "this", "that",
  "with", "from", "into", "onto", "only", "still", "your", "our", "its",
  "has", "had", "have", "his", "her", "their", "they", "them", "then",
  "than", "there", "here", "when", "where", "which", "who", "whom", "what",
  "how", "why", "all", "any", "each", "every", "some", "such", "same",
  "you", "we", "it", "is", "be", "as", "at", "by", "in", "of", "on", "or",
  "to", "up", "do", "if", "so", "no", "an", "a",
]);

/** A bracketed placeholder such as `[MASK]` is the slot, not its content. */
const PLACEHOLDER = /\[[^\]]*\]/g;

function tokenize(text: string): string[] {
  return text
    .replace(PLACEHOLDER, " ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * A token matches a lexicon word on an exact hit or a simple English
 * inflection of it. The previous matcher also accepted `w.startsWith(t)`,
 * which let any short token claim every longer entry sharing its prefix.
 */
function matches(token: string, word: string): boolean {
  if (token === word) return true;
  for (const suffix of ["s", "es", "ed", "ing"]) {
    if (token === word + suffix) return true;
  }
  // plural of a word already ending in -e ("lens" is its own entry; "tables")
  if (word.endsWith("e") && token === word + "s") return true;
  return false;
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
        if (matches(t, w)) hits += 1;
      }
    }
    dist[c] = hits;
  }
  // tiny uniform prior so zeros don't collapse
  for (const c of COLORS) dist[c] += 0.04;
  return normalize(dist);
}
