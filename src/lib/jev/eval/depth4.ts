/**
 * Depth-4 eval item.
 * Depth 1 names a port. Depth 2 fills it. Depth 3 glues two fills.
 * Depth 4 is a commitment: compose | escalate | refuse, plus who pays if wrong.
 */

export type Branch = "compose" | "escalate" | "refuse";
export type Primitive = "noul" | "choice" | "score";

export interface Depth4Item {
  id: string;
  depth: 4;
  concept: string;
  invariant: string;
  scene: string;
  ask: string;
  primitive: Primitive;
  criteria?: Record<string, string> | string[];
  gold: string | boolean | number;
  meaning: string;
  if_wrong: string;
  residual: string;
  branch: Branch;
}

/** Representative fixtures. Full hand set lives in workspace artifacts/jev-eval/depth4.jsonl. */
export const DEPTH4_FIXTURES: Depth4Item[] = [
  {
    id: "D4:mimic-iv:false-page",
    depth: 4,
    concept: "mimic-iv",
    invariant: "I8-buyer-metric",
    scene:
      "Night shift. A deterioration head returns 0.61. The conformal set covers both page-now and wait-20-min.",
    ask: "What should the harness do with this alarm?",
    primitive: "choice",
    criteria: {
      page: "send the nurse page now",
      hold: "do not page; recheck on the next window",
      escalate: "show a person the interval and let them decide",
    },
    gold: "escalate",
    meaning:
      "The conformal set is not a vote. When it covers both acts, a person owns the page. AUROC is irrelevant.",
    if_wrong:
      "page → alarm fatigue and a later ignored real code. hold → missed minutes on a real slide.",
    residual: "The buyer is the nurse's attention, not the AUROC.",
    branch: "escalate",
  },
  {
    id: "D4:doctrine-fail-closed:page-midband",
    depth: 4,
    concept: "doctrine-fail-closed",
    invariant: "I5-fail-closed",
    scene: "Allowed mass 0.55, toxin 0.04. Next step would page a charge nurse.",
    ask: "May the harness send the page?",
    primitive: "choice",
    criteria: {
      compose: "allowed ≥ 0.72 and toxin ≤ 0.12 — ship the act",
      escalate: "mid-band; a person decides",
      refuse: "toxin or allowed-too-low; do not act",
    },
    gold: "escalate",
    meaning: "0.55 is AMBER. Queue the page for a person. Do not fire. Do not drop.",
    if_wrong: "compose pages on a coin-flip; refuse hides a real deterioration.",
    residual: "Mid-band is a person, not a quieter alarm.",
    branch: "escalate",
  },
  {
    id: "D4:doctrine-color:wrong-primitive",
    depth: 4,
    concept: "doctrine-color",
    invariant: "I2-shape",
    scene:
      "Ticket: 'I am not happy with the fit. What are my options here?' Noul on refund-request was 0.22; yes/no Choice was no at 0.99.",
    ask: "Which primitive should the harness use if code must branch refund / rebook / information?",
    primitive: "choice",
    criteria: {
      noul: "yes-probability only",
      choice: "closed unordered routes",
      score: "ordered intensity",
    },
    gold: "choice",
    meaning:
      "The harness needs a route key. Choice maps onto three branches. The 0.22 Noul is a different question.",
    if_wrong: "A 0.22 maybe-refund is treated as a refund, or a Choice no is treated as calm.",
    residual: "Same English, two primitives, two answers — pick the one code can switch on.",
    branch: "compose",
  },
  {
    id: "D4:pjm-lmp:tail-not-mae",
    depth: 4,
    concept: "pjm-lmp",
    invariant: "I8-buyer-metric",
    scene: "Nowcast is $2 off on a quiet hour and $180 off on a congestion spike. Deck leads with MAE.",
    ask: "Is MAE the metric the desk is paying for?",
    primitive: "noul",
    gold: false,
    meaning: "Refuse MAE-as-proof. Card metric is pinball / CRPS on spike tails.",
    if_wrong: "The desk is long a node the model never priced on the tail.",
    residual: "The expensive hour is the product.",
    branch: "refuse",
  },
  {
    id: "D4:mimic-iv:iid-split",
    depth: 4,
    concept: "mimic-iv",
    invariant: "I7-time-split",
    scene: "Vendor deck shows 0.91 AUROC on MIMIC-IV with a random 70/30 shuffle across stays.",
    ask: "Is this number usable as evidence that the alarm will work next quarter in another hospital?",
    primitive: "noul",
    gold: false,
    meaning: "Refuse the number. Demand a time split and a site split.",
    if_wrong: "A hospital buys a pager graded on leaked future labs.",
    residual: "A shuffled stay is a future label wearing today's gown.",
    branch: "refuse",
  },
  {
    id: "D4:cmapss-rul:shop-visit",
    depth: 4,
    concept: "cmapss-rul",
    invariant: "I9-proxy-not-gold",
    scene: "Conformal RUL on C-MAPSS covers 90% of simulated failures. Slide says we can schedule shop visits.",
    ask: "Does 90% coverage on C-MAPSS authorize a shop-visit calendar?",
    primitive: "noul",
    gold: false,
    meaning: "Escalate. Gold is OEM onboard health plus shop-visit dollars. C-MAPSS is the proxy.",
    if_wrong: "An engine is pulled early or left in wing on a sim that is not the fleet.",
    residual: "A simulated cycle is not a shop invoice.",
    branch: "escalate",
  },
  {
    id: "D4:ais-vessel:dark-route",
    depth: 4,
    concept: "ais-vessel",
    invariant: "I6-risk-bar",
    scene: "Tanker goes dark 14 hours near a sanctioned port, then reappears with a vendor gap-fill track.",
    ask: "May the harness auto-clear the voyage as normal routing?",
    primitive: "noul",
    gold: false,
    meaning: "Refuse auto-clear. Flag a human compliance desk.",
    if_wrong: "A cleared dark voyage becomes a sanctions or insurance event.",
    residual: "A gap-fill is a drawing, not a clearance.",
    branch: "refuse",
  },
  {
    id: "D4:pjm-lmp:research-ok",
    depth: 4,
    concept: "pjm-lmp",
    invariant: "I9-proxy-not-gold",
    scene: "Four-week exploration: neural SDE on Data Miner 2, pinball on a 2024 holdout, no bid is sent.",
    ask: "Is this exploration in bounds?",
    primitive: "noul",
    gold: true,
    meaning: "Compose the research track. Name the proxy. Do not place a bid.",
    if_wrong: "Refusing every proxy kills the only legal way to practice.",
    residual: "Practice on the public door. Do not pretend it is the floor.",
    branch: "compose",
  },
];
