import type { Color } from "./colors.ts";
import { CONCEPTS, type ConceptCard } from "./concepts.ts";
import type { JevPrimitive } from "./seats.ts";
import type { MaskItem } from "./corpus.ts";

/** Bank item. Extends MaskItem so Simulate can still score a fill. */
export interface QuestionItem extends MaskItem {
  concept: string;
  primitive: JevPrimitive;
  kind: "noul" | "choice" | "score" | "mlm" | "restriction";
  metric: string;
  locator: string;
  temporal: boolean;
  toxin: Color;
}

const KINDS = ["noul", "choice", "score", "mlm", "restriction"] as const;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function colorsAround(gold: Color): { allowed: Color[]; forbidden: Color[] } {
  const all: Color[] = ["entity", "concept", "idea", "evidence", "action"];
  return { allowed: [gold], forbidden: all.filter((c) => c !== gold) };
}

function goldColor(c: ConceptCard): Color {
  return c.sector === "doctrine" ? "concept" : "evidence";
}

function pick(bank: string[], i: number): string {
  return bank[i] ?? bank[i % bank.length]!;
}

function noulText(c: ConceptCard, i: number): string {
  return pick(
    [
      `Is ${c.proxy} a usable public proxy for ${c.gold}?`,
      `Does a time-based split apply to ${c.name}?`,
      `Is ${c.metric} a buyer metric rather than bare accuracy?`,
      `Would a shuffled split leak future labels on ${c.name}?`,
      `Is access to ${c.proxy} ${c.access} as declared?`,
      `Does ${c.name} require a human gate before irreversible action?`,
      `Is the locator for ${c.name} a real official URL?`,
      `Must composition fail closed if the fill for ${c.name} is mid-band?`,
      `Is ${c.instrument} in scope for ${c.problem}?`,
      `Does the public proxy omit the enterprise dollar field for ${c.name}?`,
      `Is site or vintage shift the primary failure mode for ${c.name}?`,
      `Should the harness abstain when confidence lands near one-half on ${c.name}?`,
      `Is ${c.proxy} licensed for a research exploration this month?`,
      `Does ${c.problem} couple physics with a market or operations layer?`,
      `Is conformal coverage part of the decision for ${c.name}?`,
      `Would flattening pass-or-fail across seats violate C15 on ${c.name}?`,
      `Is ${c.gold} unavailable as a public download?`,
      `Does ${c.name} belong on a temporal holdout rather than a shuffle?`,
      `Is asking Jev to write a report on ${c.name} out of contract C5?`,
      `Can the harness branch on a typed answer for ${c.name} without prose?`,
    ],
    i,
  );
}

function choiceText(c: ConceptCard, i: number): string {
  return pick(
    [
      `Which primitive should code fire for ${c.name}? [MASK]`,
      `Which access tier is ${c.proxy}? [MASK]`,
      `Which instrument is named for ${c.name}? [MASK]`,
      `Which split belongs on ${c.name}? [MASK]`,
      `Which color is the decision port for ${c.name}? [MASK]`,
      `Which gate follows a mid-band answer on ${c.name}? [MASK]`,
      `Which buyer metric is bound to ${c.name}? [MASK]`,
      `Which plane owns effects for ${c.name}? [MASK]`,
      `Which failure mode dominates ${c.name}? [MASK]`,
      `Which atlas sector is ${c.name} in? [MASK]`,
      `Which gold asset does ${c.proxy} stand in for? [MASK]`,
      `Which pin must a live call use for ${c.name}? [MASK]`,
      `Which restriction parent does ${c.name} glue to? [MASK]`,
      `Which action follows GREEN on ${c.name}? [MASK]`,
      `Which action follows RED on ${c.name}? [MASK]`,
      `Which doctrine composes two systems for ${c.name}? [MASK]`,
      `Which data grain is ${c.proxy}? [MASK]`,
      `Which leakage pattern is forbidden on ${c.name}? [MASK]`,
      `Which human class owns money moves for ${c.name}? [MASK]`,
      `Which residual status if the locator is missing? [MASK]`,
    ],
    i,
  );
}

function scoreText(c: ConceptCard, i: number): string {
  return pick(
    [
      `How faithfully does ${c.proxy} stand in for ${c.gold}?`,
      `How severe is temporal shift on ${c.name}?`,
      `How likely is a mid-band coin-flip on ${c.name}?`,
      `How usable is ${c.locator} for a four-to-eight week exploration?`,
      `How coupled is ${c.problem} to an operations or market layer?`,
      `How calibrated should conformal sets be on ${c.metric}?`,
      `How toxic is an accuracy-only report for ${c.name}?`,
      `How ready is the harness to branch on ${c.name}?`,
      `How complete is the public schema versus ${c.gold}?`,
      `How hard is site transfer on ${c.name}?`,
      `How much does ${c.instrument} change the buyer metric?`,
      `How safe is auto-compose on ${c.name}?`,
      `How grounded is the locator for ${c.name}?`,
      `How leaked is a shuffled split on ${c.name}?`,
      `How expensive is a false GREEN on ${c.name}?`,
      `How close is ${c.proxy} to production feature engineering?`,
      `How necessary is a human in the loop for ${c.name}?`,
      `How well does ${c.metric} match a desk or ward decision?`,
      `How stable is ${c.name} across vintages?`,
      `How far is week-one access from ${c.gold}?`,
    ],
    i,
  );
}

function mlmText(c: ConceptCard, i: number): string {
  return pick(
    [
      `The public stand-in for ${c.gold} is the [MASK] ${c.proxy}.`,
      `Buyer scoring on ${c.name} uses [MASK] (${c.metric}), not accuracy.`,
      `Fill the port: compose ${c.name} only after a [MASK] gate.`,
      `A shuffled split on ${c.name} is a [MASK] of future labels.`,
      `${c.instrument} is the named [MASK] for ${c.problem}.`,
      `Pin live calls for ${c.name} to [MASK] jev-1.13.0.`,
      `${c.locator} is the [MASK] locator, not a guessed URL.`,
      `Mid-band on ${c.name} is a [MASK] and must escalate.`,
      `The enterprise dollar field on ${c.name} is a missing [MASK].`,
      `Fail closed: a forbidden color fill is a [MASK].`,
      `${c.access} is the declared [MASK] tier for ${c.proxy}.`,
      `Time-based holdout is the required [MASK] on ${c.name}.`,
      `${c.sector} is the atlas [MASK] for this card.`,
      `Do not ask Jev to write a report; the [MASK] is a typed answer.`,
      `Restriction of this item lands on the parent [MASK] ${c.sector}.`,
      `Toxin mass above threshold blocks [MASK] of ${c.name}.`,
      `${c.problem} is the funded [MASK], not a toy classifier.`,
      `Sheet jev_log is the [MASK] corpus when the secretary is wired.`,
      `GREEN ships ${c.name}; AMBER is a [MASK] to a person.`,
      `The harness branches on ${c.name} with a [MASK], never prose.`,
    ],
    i,
  );
}

function restrictionText(c: ConceptCard, i: number): string {
  return pick(
    [
      `Restrict ${c.name} onto doctrine-color: the port is a [MASK].`,
      `Restrict ${c.name} onto doctrine-fail-closed: mid-band is [MASK].`,
      `Two covers of ${c.name} must agree on the shared [MASK].`,
      `Drop items whose concept is not in the parent [MASK] ${c.sector}.`,
      `Glue ${c.name} to ${c.locator} only if the edge is [MASK].`,
      `Mask-restrict ${c.metric} onto the buyer [MASK].`,
      `The overlap of ${c.name} and doctrine-mask keeps one [MASK].`,
      `If locators disagree, mark the restriction [MASK], do not invent.`,
      `Parent gold for ${c.proxy} is the locked [MASK] ${c.gold}.`,
      `Rho from ${c.name} to doctrine-fail-closed refuses toxin [MASK].`,
      `A second cover of ${c.problem} must reuse the same [MASK] metric.`,
      `Enterprise cards restrict evidence to [MASK] when the URL opens.`,
      `Doctrine cards restrict concept to [MASK] on color match.`,
      `Unobserved related-to edges are a [MASK], not a link.`,
      `residualMeaning stays one [MASK] when glue fails.`,
      `Open slots must not grow under gamma without an [MASK].`,
      `Seat judge output restricts to harness [MASK] compose escalate refuse.`,
      `C15: do not flatten this restriction into one [MASK] bit.`,
      `Pin restriction: model field equals [MASK] jev-1.13.0.`,
      `Collector points at ${c.id}; it does not [MASK] the source repo.`,
    ],
    i,
  );
}

export function generateQuestions(conceptId: string): QuestionItem[] {
  const c = CONCEPTS.find((x) => x.id === conceptId);
  if (!c) return [];
  const gold = goldColor(c);
  const { allowed, forbidden } = colorsAround(gold);
  const toxin = forbidden.includes("action") ? "action" : forbidden[0]!;
  const out: QuestionItem[] = [];
  for (const kind of KINDS) {
    for (let i = 0; i < 20; i++) {
      const primitive: JevPrimitive =
        kind === "noul" ? "noul" : kind === "score" ? "score" : "choice";
      const text =
        kind === "noul"
          ? noulText(c, i)
          : kind === "choice"
            ? choiceText(c, i)
            : kind === "score"
              ? scoreText(c, i)
              : kind === "mlm"
                ? mlmText(c, i)
                : restrictionText(c, i);
      out.push({
        id: `C:${c.id}:${kind}:${pad(i)}`,
        concept: c.id,
        primitive,
        kind,
        text,
        gold,
        allowed,
        forbidden,
        toxin,
        note: `${kind} bound to ${c.id}; metric=${c.metric}`,
        metric: c.metric,
        locator: c.locator,
        temporal: c.temporal,
      });
    }
  }
  return out;
}

export function generateAll(): QuestionItem[] {
  return CONCEPTS.flatMap((c) => generateQuestions(c.id));
}

export function countFor(conceptId: string): number {
  return generateQuestions(conceptId).length;
}
