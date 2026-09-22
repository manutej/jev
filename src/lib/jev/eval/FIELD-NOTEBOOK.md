# Field notebook — what a JEV answer means

Depth 1 names a port. Depth 2 fills it. Depth 3 glues two fills.
Depth 4 is a **commitment**: compose, escalate, or refuse — and a sentence about who pays if that commitment is wrong.

The generated 100-per-concept bank is depth 1–2. It is not wrong. It is mute.

## Verbs

| Verb | Gate | Person? | Typical act |
| --- | --- | --- | --- |
| compose | GREEN | only if policy says so on irreversible acts | log, reserve, rank, open a reversible ticket |
| escalate | AMBER / mid-band / high-harm | yes | nurse page, bid after gate, tool lockout, host isolation, ERP write |
| refuse | RED / out of contract | no act | generation prompts, date-math, i.i.d. on temporal cards, `jev-latest`, missing seat |

## Invariants

- **I1 pin.** Live `model` is `jev-1.13.0`. Never `jev-latest` in prod.
- **I2 shape.** Noul is P(true), no confidence field. Choice is a closed unordered set. Score is an ordered rubric. Noul and yes/no Choice on the same English need not agree (learnjev three-primitives disagreement: refund Noul 0.22 vs Choice no @ 0.99).
- **I3 code-math.** Counts, sums, date compare stay in code (jaggedness 1.13 modes 2–3).
- **I4 atomic.** One judgment per question. Combine in code. `P(A)+P(¬A)` is not required to be 1.
- **I5 fail-closed.** toxin > 0.12 → RED. allowed < 0.40 → RED. (0.40, 0.72) → AMBER. Only allowed ≥ 0.72 and toxin ≤ 0.12 → GREEN.
- **I6 risk-bar.** Read-only may move at ~0.5. Money, isolation, a page, a breaker need a higher bar and a human on AMBER/RED.
- **I7 time-split.** `ConceptCard.temporal` → time or site split. An i.i.d. shuffle is leakage.
- **I8 buyer-metric.** Lead-time vs false-page, pinball on tails, escaped-defect vs budget. Never bare accuracy.
- **I9 proxy ≠ gold.** MIMIC is not the EHR. Data Miner is not the desk book. C-MAPSS is not shop-visit dollars.
- **I10 human-gate.** Irreversible acts: Jev proposes compose/escalate/refuse. A person confirms compose.
- **I11 locator.** Evidence cites a door that opens.
- **I12 no generation.** Jev does not write the report.
- **I13 filter-state.** Send only what the question needs.
- **I14 literal.** jev-1.13 reads the words you wrote. Hedges are extra questions.

## Sources

`docs.typesafe.ai` System One, primitives, confidence, jaggedness 1.13.
`learnjev.com/tutorials/three-primitives`.
`manutej/jev` `score.ts`, `seats.ts`, `concepts.ts`, `typesafe/contract.ts`.
Enterprise atlas concept cards.
