# TypeSafe wire contract

Jev the *workbench* is not Jev the *model*. The model is TypeSafe System One.
This folder is the codec between them.

## Pin

`jev-1.13.0`. Not `jev-latest`. Gateway id `typesafe-ai/jev`.

The pin is written once, at `TYPESAFE_PINNED_MODEL` in `contract.ts`. Nothing
else — not `seats.ts`, not `from-seats.ts` — may write the string.

## Shape

```
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer $TYPESAFE_API_KEY   # Vercel env only
```

Request:

```ts
{
  state: string | object | array,
  model: "jev-1.13.0",
  questions: {
    [id]: { type: "choice" | "score" | "noul", instructions, criteria }
  }
}
```

- Choice `criteria`: map of option → description (or structured what/not_for).
- Score `criteria`: ordered standalone levels, 2–10. Never a numeric range.
- Noul `criteria`: optional `{ true, false }`.
- Question ids are for code. The model sees `instructions` only.

Answers are keyed the same way. Choice/Score include `confidence`.
Noul returns only `noul` in `[0,1]`. A Noul near 0.5 is a coin flip.

> **Unverified.** `docs.typesafe.ai` returns 403 from this environment, so every
> field name, every numeric limit (Score 2–10, Choice 255, mid-band 0.4–0.6) and
> the model id itself are transcribed from the PR, not validated against the live
> API. A schema change is a one-file edit to `contract.ts`.

## The state blob

Every prompt is written against one shape, declared as `SeatsState` in
`from-seats.ts`, so that a prompt can name the path it reads:

```ts
{
  item:    { id?, text, allowed: Color[], forbidden: Color[], note? },
  concept?: { name?, gold?, proxy?, locator?, metric?, temporal? }
}
```

`item` mirrors `corpus.ts:MaskItem`; `concept` mirrors the `concepts.ts:ConceptCard`
fields the prompts actually read. `fromSeats` refuses a state that does not carry
this (`state-shape`), including a `text` that does not contain exactly one
`[MASK]` — a count, done in code, not asked of a model.

## The eleven seats

One request, eleven typed questions, asked in parallel. **No question can see
another's answer**, so no seat adjudicates over the others: code composes.

| seat | question id | type | role |
| --- | --- | --- | --- |
| `lexicographer` | `terms_defined_in_text` | noul | load-bearing |
| `colorist` | `gold_color` | choice | load-bearing |
| `primitive-picker` | `primitive` | choice | advisory |
| `adversary` | `toxin_color` | choice | advisory |
| `evidence-clerk` | `locators_resolvable` | noul | load-bearing |
| `leakage-auditor` | `split_leakage` | choice | load-bearing |
| `decision-metric` | `metric_is_decision` | noul | load-bearing |
| `restriction-map` | `restrictions_agree` | noul | load-bearing |
| `harness-teacher` | `harness_can_branch` | noul | advisory |
| `temporal-steward` | `temporal_split` | choice | load-bearing |
| `domain-expert` | `proxy_fidelity` | score | load-bearing |

Five seats were deleted and are not coming back: `fail-closed-gate`, `judge` and
`glue-checker` (aggregators that could not see the siblings they purported to
judge); `calibration-steward` (asked the model to predict what `isMidBandNoul`
computes exactly); `masker` (asked the model to count, which is now
`countMasks`).

`toxin_color`'s candidates are the item's **forbidden** kinds plus an explicit
`none`. It never offers a permitted kind, and it is a recorded advisory — no
rule reads it.

## What stays in code

- `score.ts` / `score_fill` — shipping gate (GREEN / AMBER / RED)
- Thresholds τ_g=0.72, τ_t=0.12, τ_r=0.4
- Mid-band Noul (0.4–0.6) **on a load-bearing seat** → AMBER. The band is
  **exclusive at both ends**: exactly 0.400 and exactly 0.600 are decisive.
- `ADVERSE_NOUL_BELOW = 0.5` (`seats.ts`) — a load-bearing noul strictly below
  this is adverse and takes the seat's declared cap.
- `CONFIDENCE_FLOOR = 0.5` (`compose.ts`) — R7.
- No answer of any primitive can raise the local verdict.
- Effects: Vercel / workbench. This package does not fetch.

## Composition

`RED < AMBER < GREEN`. Composition is the **meet**. Every rule may only lower.

| id | rule | result |
| --- | --- | --- |
| R0 | seed at `local.verdict` from `scoreFill` | seed |
| R1 | `res.model !== TYPESAFE_PINNED_MODEL` | `err(wrong-model)` |
| R2 | an answer's type, or the range its type implies, is wrong | `err(<type>-type)` |
| R3 | a load-bearing seat has no answer | RED — absence is never neutral |
| R4 | a Choice answer is not a key of its criteria | `err(choice-type)` |
| R5 | a mid-band noul on a load-bearing seat | `meet(v, AMBER)` |
| R6 | a load-bearing seat's **answer value** is adverse | `meet(v, the seat's declared cap)` |
| R7 | `confidence < 0.5` on a Choice that fired R6 | `meet(v, AMBER)` |

Each seat declares its adverse direction and cap in `SEAT_SPECS.adverse`; three
seats declare `{ kind: "none", reason }` instead, because no answer they can give
is adverse on its own. `colorist` is the interesting one: which kind is adverse
depends on `item.allowed` / `item.forbidden`, which the composer is never given —
that comparison is `scoreFill`'s, in code.

`err` means **do not ship**. `verdictOf(result)` returns RED on the error branch,
so a caller cannot reach past R1/R2/R4 to a local GREEN.

`opts.loadBearing` may only **widen** the default; narrowing or emptying it is
`err(load-bearing-set)`.

## Run the tests

```sh
node --experimental-strip-types --test \
  src/lib/jev/operad.test.ts \
  src/lib/jev/fp/cospan.test.ts \
  src/lib/jev/typesafe/contract.test.ts
```

**The test files must be named explicitly.** `node --test src/lib/jev/` fails with
`MODULE_NOT_FOUND` — a directory is not a test path, and the same failure appears
with and without the flag. Do **not** write the file list as
`src/lib/jev/**/*.test.ts`: `globstar` is off by default in bash and absent from
dash, so `**` degrades to `*`, `operad.test.ts` is silently skipped, and the run
still reports green.

Verified on **node v22.22.2**, where type stripping is on by default and
`--experimental-strip-types` is inert; it is kept above because that is the form
that was verified. No minimum node version was measured here, so none is stated.
There is no `package.json`; adding one is outside this PR's scope.

Expected: `# tests 37 / # pass 37 / # fail 0` (9 pre-existing + 28 in
`contract.test.ts`).

## Files

| File | Role |
| --- | --- |
| `src/lib/jev/typesafe/contract.ts` | Request/response types + validators |
| `src/lib/jev/typesafe/from-seats.ts` | seats → one legal request |
| `src/lib/jev/typesafe/compose.ts` | Answers + score_fill → verdict |
| `src/lib/jev/typesafe/contract.test.ts` | Contract tests |
| `src/lib/jev/seats.ts` | The eleven seats and their declarations |
| `docs/EVALUATION.md` | What was measured, and what it did not settle |

Kernel (`operad.ts`, `colors.ts`, `score.ts`, `lexicon.ts`, `concepts.ts`,
`corpus.ts`, `temporal.ts`, `doctrines.ts`, `fp/`, Rust WASM) is unchanged.
