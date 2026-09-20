import { COLORS, type Color } from "./colors.ts";

export type Verdict = "GREEN" | "AMBER" | "RED";

export interface Thresholds {
  /** allowed mass must be ≥ this for GREEN */
  green: number;
  /** toxin mass above this is always RED (fail closed) */
  toxin: number;
  /** allowed mass below this is RED even without toxin */
  red: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  green: 0.72,
  toxin: 0.12,
  red: 0.4,
};

export type Dist = Record<Color, number>;

export function emptyDist(): Dist {
  return { entity: 0, concept: 0, idea: 0, evidence: 0, action: 0 };
}

export function normalize(dist: Dist): Dist {
  const z = COLORS.reduce((s, c) => s + Math.max(0, dist[c]), 0);
  if (z <= 0) return emptyDist();
  const out = emptyDist();
  for (const c of COLORS) out[c] = Math.max(0, dist[c]) / z;
  return out;
}

export interface JevScore {
  verdict: Verdict;
  allowedMass: number;
  toxinMass: number;
  pMax: { color: Color; p: number };
  dist: Dist;
  reasons: string[];
}

export function scoreFill(
  dist: Dist,
  allowed: Color[],
  forbidden: Color[],
  tau: Thresholds = DEFAULT_THRESHOLDS,
): JevScore {
  const p = normalize(dist);
  const allowSet = new Set(allowed);
  const forbidSet = new Set(forbidden);
  let allowedMass = 0;
  let toxinMass = 0;
  let pMax: { color: Color; p: number } = { color: allowed[0] ?? "concept", p: 0 };
  for (const c of COLORS) {
    if (p[c] > pMax.p) pMax = { color: c, p: p[c] };
    if (allowSet.has(c)) allowedMass += p[c];
    if (forbidSet.has(c)) toxinMass += p[c];
  }
  const reasons: string[] = [];
  let verdict: Verdict;
  if (toxinMass > tau.toxin) {
    verdict = "RED";
    reasons.push(`Toxin mass ${toxinMass.toFixed(2)} exceeds τ_t=${tau.toxin}`);
  } else if (allowedMass < tau.red) {
    verdict = "RED";
    reasons.push(`Allowed mass ${allowedMass.toFixed(2)} below τ_r=${tau.red}`);
  } else if (allowedMass >= tau.green && toxinMass <= tau.toxin) {
    verdict = "GREEN";
    reasons.push(`Allowed ${allowedMass.toFixed(2)} ≥ τ_g=${tau.green}; toxin ${toxinMass.toFixed(2)}`);
  } else {
    verdict = "AMBER";
    reasons.push(`Allowed ${allowedMass.toFixed(2)} in (${tau.red}, ${tau.green}); needs more evidence`);
  }
  if (verdict !== "GREEN") reasons.push("Fail closed — composition does not ship");
  return { verdict, allowedMass, toxinMass, pMax, dist: p, reasons };
}

/** Brier score against a one-hot gold color. Lower is better. */
export function brier(dist: Dist, gold: Color): number {
  const p = normalize(dist);
  let s = 0;
  for (const c of COLORS) {
    const y = c === gold ? 1 : 0;
    s += (p[c] - y) ** 2;
  }
  return s;
}
