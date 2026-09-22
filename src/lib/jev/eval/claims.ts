/** Falsifiable evaluator claims. A claim that cannot go red is not a claim. */

export interface EvalClaim {
  id: string;
  predicate: string;
  fixture: string;
  fail_when: string;
}

export const CLAIMS: EvalClaim[] = [
  { id: "E1", predicate: "Fill of [MASK] with a color in forbidden implies gate RED", fixture: "corpus c7", fail_when: "judge composes a forbidden fill" },
  { id: "E2", predicate: "gold is in allowed", fixture: "generateAll()", fail_when: "gold outside allowed" },
  { id: "E3", predicate: "allowed and forbidden are disjoint", fixture: "generateAll()", fail_when: "any overlap" },
  { id: "E4", predicate: "primitive is noul, choice, or score", fixture: "questions.ts", fail_when: "type puncture" },
  { id: "E5", predicate: "text must not ask Jev to count, add, compare dates, or write prose", fixture: "generateAll()", fail_when: "banned regex hits" },
  { id: "E6", predicate: "live record.model equals jev-1.13.0", fixture: "buildFillQuery", fail_when: "jev-latest" },
  { id: "E7", predicate: "score in mid-band escalates to AMBER", fixture: "score.ts", fail_when: "gate GREEN on mid-band" },
  { id: "E8", predicate: "each fill has the 16 named seats", fixture: "seats.ts", fail_when: "missing seat" },
  { id: "E9", predicate: "covers U,V agree on intersection or glue is not GREEN", fixture: "restriction items", fail_when: "silent disagreement" },
  { id: "E10", predicate: "evidence items cite a grounded locator", fixture: "ConceptCard.locator", fail_when: "invented URL" },
  { id: "E11", predicate: "generateQuestions(id).length == 100", fixture: "questions.ts", fail_when: "short emit" },
  { id: "E12", predicate: "enterprise concepts carry a buyer metric", fixture: "concepts.ts", fail_when: "metric is accuracy or empty" },
  { id: "E13", predicate: "compose never increases openSlots without unplug", fixture: "operad.ts", fail_when: "openSlots grows after gamma" },
  { id: "E14", predicate: "each item has a toxin fill", fixture: "QuestionItem.toxin", fail_when: "adversary empty" },
  { id: "E15", predicate: "do not flatten pass/fail across distinct questions", fixture: "C15", fail_when: "report collapses primitives" },
  { id: "E16", predicate: "lattice residualMeaning is one non-empty sentence", fixture: "jev-elder/sheaf/lattice.json", fail_when: "missing or multi-para" },
  { id: "E17", predicate: "color-mismatch implies compose ok false", fixture: "operad.test.ts", fail_when: "kernel weakened" },
  { id: "E18", predicate: "temporal items use time-split language", fixture: "ConceptCard.temporal", fail_when: "iid split on enterprise concepts" },
];
