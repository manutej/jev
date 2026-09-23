# EVALUATION — what was measured before this codec landed

This is the evidence trail for `src/lib/jev/typesafe/` and `src/lib/jev/seats.ts`.
It records what was run, what it showed, and — deliberately — the findings that
are **not** acted on here because the files they concern are frozen.

Every number below was produced by a command, not by reading. Nothing in it is a
claim about the TypeSafe System One service: `docs.typesafe.ai` and
`api.typesafe.ai` return 403 at the egress proxy, so **no Jev call was ever made
or attempted**. Where a "respondent" appears below it is a Claude Haiku stand-in,
one fresh process per evaluation, no shared context, no tools. Conclusions are
about *the instrument* — whether a panel of typed questions, composed by the
declared rules, separates sound material from defective material. They are not
about how Jev behaves, and the leaf rates must not be ported to it.

---

## 1. The panel

Five review seats read the design specification in isolation — `user`,
`operator`, `craft`, `red team`, `domain` — and their findings were merged on
the **kernel**: the one fact a fix has to change. 48 rows survived merging:
7 P0, 26 P1, 12 P2, 1 gated on information nobody in the run could obtain.

Isolation is not independence. All five ran on the same model, from the same
brief, written by the same coordinator. Five seats agreeing is five instances of
one prior, so a merged row was allowed to outrank a single-seat row **only when
at least one seat carried a reproduction**, and every P0 reproduction was re-run
independently before it was accepted. Strikes (evidence form absent): 3.
Not-reproduced (form present, re-run contradicted it): 0.

The one partial exception is worth naming: the `domain` seat was the only one
that consulted an authority document outside the coordinator's framing, and
eight of its fourteen rows were reached by no other seat. The lowest-overlap pair
in the matrix is `domain ∩ operator` at 4 rows — they audited different objects
(what the spec asserts about the repository, versus what it means to the model it
targets) and neither could have found the other's rows with the tools it chose.

**Discrimination was not measured.** No calibration twin was run, so the panel's
planted-row recall and false-positive rate are unknown. That is a gap in the
evidence, not a clean bill.

---

## 2. Three consistency-gate runs, and why each failed

An instrument of typed questions was built, measured, repaired and re-measured
three times. All three runs **failed**, and the three failures are different.

| run | tree | corpus | verdict | why |
| --- | --- | --- | --- | --- |
| v1.0 | 35 nodes, breadth 5 | 8 fixtures | **FAIL** | The composed root is a **constant**: 0 bits of entropy over 8 fixtures. Agreement with the direct arm 0/8 under the real rules, while a deliberately weakened control scored 5/8 — the gate discriminated, in the wrong direction. Cause: four saturated vetoes ANDed behind a fail-closed floor. |
| v1.1.0 | repaired | 8 fixtures | **FAIL** | A better-built instrument with the same root defect. Composed root AMBER on 8/8, 0.0000 bits. Its 7/8 agreement is exactly the score of a predictor that ignores the instrument and always says AMBER. Cause renamed: **union saturation** — v1.0 ANDed four saturated vetoes, v1.1.0 ANDs eight non-saturated caps behind an unchanged floor, and a conjunction of eight caps saturates. |
| v2.0.0 | 15 nodes, breadth 3 | 36 items (26 clean + 10 defective), 72 fresh evaluations | **FAIL** | The root is fixed — non-constant, 1.4262 bits combined, 0 false GREENs on 10 defective items against the weakened control's 5/10 (Fisher exact two-sided p = 0.0325). It fails on **arithmetic**: the budget is blown by the one node whose zero cost was never a judgment call. |

The first two runs failed because the root could not disagree with anything. The
third failed because its cost model was wrong. The third is the useful one, and
§4 and §5 are its two findings.

**A limit on the third run's headline.** `false GREEN = 0/10` has a 95% interval
of [0.000, 0.308] — consistent with a true rate near 0.3 — and it rests on one
item. `d9`, authored as a genuinely ambiguous span, was held **not** by the node
designed for it (which answered 0.90 and did not cap) but by an unrelated node
that fired because `d9`'s bound card happens to be temporal. Bound to a different
card, `d9` composes GREEN. The true rate is 0/10 as measured and 1/10 under a
binding change the experimenter could have made just as defensibly.

---

## 3. The recurring defect: a code-computed node promoted to a veto nobody ran

The same shape appears in every run, and it is the reason this codec deletes
seats rather than rewording them.

- **v1.0** — four **saturated vetoes**, each firing on a **code-computed or
  state-determined** value rather than on a respondent's judgment. Because they
  were code, their results were respondent-independent: they would reproduce
  against any model, Jev included. ANDed behind a fail-closed floor they made the
  root a constant.
- **v1.1.0** — eight **saturated caps**, same floor, same outcome one rung up.
- **v2.0.0** — one code node, `scoreFill` applied to a respondent distribution,
  charged `p = 1.000` and admitted **outside** the budget on the strength of
  0 firings in 8 items. Re-measured at n = 26 it fires 5/26: clear rate 0.808,
  95% CI **[0.606, 0.934]**, an interval that **excludes 1.000**.

The canonical instance in this repository is `classifyLocal` (`lexicon.ts:95`), a
pure local keyword counter that was treated across the specification as the
source of the `dist` fed to `scoreFill` — while its **only caller in the tree is
`operad.test.ts:46`**. A node that nobody runs was carrying a veto.

Measured behaviour of `classifyLocal`, on this repository's own 8-fixture corpus:

- `tokenize()` strips `[MASK]` to `mask`, which is an exact lexicon **action**
  word, so every sentence in the corpus receives action mass — `[MASK]` alone
  drives action to **0.87**.
- the match is `t === w || t.startsWith(w) || w.startsWith(t)`, so the word `the`
  matches `theory` and `thesis` and every sentence receives idea mass — `the`
  alone drives idea to **0.93**.
- consequence: toxin mass above τ_t = 0.12 on 6 of 8 fixtures (c1 0.62, c4 0.43,
  c6 0.26, c2 0.25, c7 0.22, c8 0.17) and a verdict of **RED on 7 of 8**.

**Fixed, on explicit authorisation to unfreeze `lexicon.ts`.** The finding was
originally filed here as a finding rather than a change, because `lexicon.ts`
was frozen by this PR's scope. That freeze was lifted deliberately and the fix
applied:

- a bracketed placeholder is removed before tokenising, so `[MASK]` no longer
  contributes the action word `mask`;
- the `w.startsWith(t)` branch is deleted. It was the destructive one: any
  short token claimed every longer entry sharing its prefix (`the` → `theory`,
  `co` → `color` / `compose` / `cospan` / `count`). A token now matches on an
  exact hit or a simple inflection (`-s`, `-es`, `-ed`, `-ing`);
- function words are filtered by an explicit stop-list.

Measured after the fix, same corpus: `[MASK]` and `the` carry **no preference**
at all, `publish the report` reads **action 0.87** where it previously read idea
0.64, and the verdict is **RED on 2 of 8** rather than 7 of 8. Argmax agrees
with the gold colour on 3 of 8 — the remaining misses are the classifier typing
the *sentence* rather than the *masked span*, a separate and still-open
limitation (see "Where `local.dist` comes from" below). Six regression tests in
`lexicon.test.ts` pin every clause above; all six fail against the pre-fix file.

Note also that fixing it would have bought the v1.0 gate exactly zero fixtures,
because three worse defects fired before `classifyLocal` was ever consulted — it
was a real, severe bug **masked** by others, which is the usual reason such a
bug survives. That ordering is why it is worth fixing now and was not worth
fixing then.

The design conclusion this codec acts on: *keep known rules, exact calculations
and lookups in code, and do not also ask a model for them.* That is why
`masker` became `countMasks`, why `calibration-steward` became `isMidBandNoul`,
and why `fail-closed-gate`, `judge` and `glue-checker` became `compose.ts`.

---

## 4. The conjunction / budget law

A composed gate that ANDs `N` independent caps ships an item only when every cap
clears:

```
ship = Π p_i        and, at equal marginals,        ship = p^N
```

This is why the first two runs saturated: at `p = 0.9` and `N = 8`, `ship` is
0.43 before any item is looked at — the floor does the deciding, not the
evidence. It is also the arithmetic the third run failed.

Measured, n = 26 clean items:

| node | charged | fires | clear `p` | 95% CI |
| --- | --- | --- | --- | --- |
| mask count (code) | free | 0/26 | 1.000 | [0.868, 1.000] |
| port/gold (code) | free | 0/26 | 1.000 | [0.868, 1.000] |
| span pinned (judgment) | free | 0/26 | 1.000 | [0.868, 1.000] |
| gloss contradiction (judgment) | free | 0/26 | 1.000 | [0.868, 1.000] |
| **`scoreFill` (code)** | **free** | **5/26** | **0.808** | **[0.606, 0.934]** |
| permitted-set gap | budgeted 0.750 | 6/26 | 0.769 | [0.564, 0.910] |
| future-known | budgeted 0.750 | 7/26 | 0.731 | [0.522, 0.884] |

The two budgeted caps replicate almost exactly — 0.769 × 0.731 = **0.5621**
against a declared 0.5625, across a corpus that grew from 8 items to 26 and from
6 cards to 16. **The budget did not fail because the budgeted nodes were
mis-measured. It failed because a node that was never charged turned out to cost
0.192.** Design product 0.4540 against a stated floor of 0.50.

**The correlation correction.** The product is not merely mis-parameterised; its
functional form is measured to be wrong. Realized joint clear rate **0.5000**
against a design product of **0.4540**: gap **0.0460** against a corpus
resolution of 1/26 = **0.0385**.

| pair | observed co-fire | independent prediction |
| --- | --- | --- |
| `scoreFill` & permitted-set | 3/26 = 0.115 | 0.044 |
| `scoreFill` & future-known | 2/26 = 0.077 | 0.052 |
| permitted-set & future-known | 0/26 = 0.000 | 0.062 |

Independence is refuted **in both directions at once**: two caps downstream of
the same hedged distribution co-fire 2.6× more often than independence allows,
while another pair never co-fires at all. Here the error runs in the
shipping-favourable direction — the conjunction loses less than independence
predicts — which means it will run the other way somewhere else. Budget against
the measured joint; demote `p^N` to a design-time sanity check.

The practical consequence for `compose.ts`: the rule table is kept short and
every rule is a *meet*, so adding a rule can only lower `ship`, and each added
rule must be paid for out of a measured budget rather than assumed free.

---

## 5. The `e14` finding — the threshold punishes calibration

`e14` is a clean item. The respondent typed it **correctly**: argmax equals gold,
at **0.75**, which clears τ_g = 0.72. It is nevertheless **REFUSED**, because
0.15 of hedging mass lands on a forbidden kind and τ_t = 0.12 treats that
residual as toxin. A confident-but-honest distribution is punished for the
honesty; a sharper, less calibrated one at 0.95/0.05 would ship.

This is not an isolated accident. `scoreFill` fired on 5 of 26 clean items, and
`Q2.1` — the question whose distribution it scores — was **correct on all 26**
(argmax = gold 26/26, Brier **0.0966**). Every one of the five is a threshold
event on a correctly-typed span: four sit in the band between τ_r = 0.40 and
τ_g = 0.72; `e14` clears τ_g and is refused on the residual alone.

Four of the five share one shape — `gold = evidence` with `idea` in `forbidden`.
Off that shape the node clears at 0.952 (20/21) and the whole conjunction clears
at 0.535, above the floor. The shape is **not** an artefact of the new items:
shipped fixture `c4` has exactly it and is one of the four. Both numbers are
reported; the free-set verdict is robust to that dispute in sign but not in
magnitude.

The instrument under test stated, in its own text, *"an instrument whose RED
fired on a clean corpus would be broken."* Its RED fires on `e14`.

**This is filed as an open question about `score.ts`, not as a change.** `score.ts`
is frozen; P9 pins τ_g = 0.72, τ_t = 0.12, τ_r = 0.4 in code and this PR does not
move them. The question for whoever opens `score.ts` next is narrow:

> Should `τ_t` apply to the residual mass of a distribution whose argmax is
> already correct and above `τ_g`, or only to a distribution whose argmax is
> itself forbidden or ambiguous?

And a warning that comes with it: **do not answer it by adjusting `τ_t` on this
run's answers.** That is tuning on the measurement. Either the residual rule
changes on an argument, or a fresh corpus decides it.

---

## 6. Two more findings recorded, not acted on

**A card-tracking claim that does not replicate.** One budgeted node was admitted
on evidence that it "tracks `card.temporal` — every temporal-true card above
every temporal-false card", measured on 6 cards. Across 16 cards it fires 5/13
on temporal-true (0.385) and 2/13 on temporal-false (0.154) and the ordering
collapses: a temporal-**false** card at 0.65 outranks seven temporal-true cards,
one of which was measured at 0.95 on the small corpus and answers 0.15 twice
here. **The rate survived; the reason for admitting it did not.**

**Agreement is not a pass criterion, and now there is a number for why.** A
constant-AMBER predictor agrees with the directly-asked arm 14/26 on clean items
and 20/36 combined, beating the real rules (10/26, 14/36) and the weakened
control (8/26, 11/36). Separately, three of the direct arm's four clean REDs
refuse the item because the respondent read the literal `[MASK]` token as an
unfilled placeholder — so that arm is partly measuring the masking convention,
not the item.

---

## 7. What this codec changed because of the above

| finding | change in this PR |
| --- | --- |
| Aggregator seats cannot see their siblings | `fail-closed-gate`, `judge`, `glue-checker` deleted; `compose.ts` composes |
| Models are asked for what code computes | `masker` → `countMasks`; `calibration-steward` → `isMidBandNoul` |
| A complete, maximally adverse response composed GREEN | **R6** — a load-bearing seat's *answer value*, against a cap the seat declares |
| An out-of-enum Choice polluted the record silently | **R4** — a Choice must be a key of its criteria, or `err` |
| The adversary seat offered the *permitted* kinds and no way to decline | `toxin_color`'s candidates are the forbidden kinds plus `none` |
| Prompts leaned on vocabulary defined nowhere the model could see | every prompt rewritten self-contained, naming the state paths it reads |
| A conditional question had no not-applicable outcome | `temporal_split` is a Choice with `not_temporal` and `not_described` |
| The Score seat had no consumer | `proxy_fidelity` is load-bearing, levels reordered worst → best |
| The load-bearing option could silently narrow | it may only widen; narrowing is `err(load-bearing-set)` |

## 8. What is still open

- **`score.ts` τ_t and the `e14` case** (§5). Frozen here.
- ~~**`lexicon.ts` `classifyLocal`** (§3).~~ **Fixed** — the freeze was lifted
  on explicit authorisation. See §3 for the measured before/after.
- **Where `local.dist` comes from.** Nothing wires `classifyLocal` to
  `composeVerdict`; the specification never sourced it. Until it is wired, the
  scope of "no model answer can raise a local verdict" depends on a seed whose
  provenance is unpinned.
- **`colorist` has no adverse direction the composer can evaluate.** Which kind is
  adverse depends on `item.allowed` / `item.forbidden`, which `JevScore` does not
  retain and `SystemOneResponse` never carried. That is the defect that retired
  R8, and it is recorded rather than patched.
- **R7 is inert on the current declarations.** Every declared cap is AMBER or RED,
  so the verdict is already at or below AMBER by the time R7 runs. It is retained
  as the guard for any seat that declares a GREEN cap, and test 24 fails the
  moment one does.
- **Everything about the live API.** 403 at CONNECT. No wire field, numeric limit
  or model id in `contract.ts` is validated.
