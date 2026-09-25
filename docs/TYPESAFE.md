# TypeSafe wire contract

Jev the *workbench* is not Jev the *model*. The model is TypeSafe System One.
This folder is the codec between them.

## Pin

`jev-1.13.0`. Not `jev-latest`. Gateway id `typesafe-ai/jev`.

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

## What stays in code

- `score.ts` / `score_fill` — shipping gate (GREEN / AMBER / RED)
- Thresholds τ_g=0.72, τ_t=0.12, τ_r=0.4
- Mid-band Noul (0.4–0.6) on a load-bearing seat → AMBER (`compose.ts` `composeVerdict`)
- Judge Choice cannot override a local RED (`compose.ts` `composeVerdict`)
- Effects: Vercel / workbench. This package does not fetch.

## Files

| File | Role |
| --- | --- |
| `src/lib/jev/typesafe/contract.ts` | Request/response types + validators. Pin, endpoint and Noul mid band come from `.jev/jev-core.ts` |
| `src/lib/jev/typesafe/from-seats.ts` | 16 seats → one legal request. **Not present yet** |
| `src/lib/jev/typesafe/compose.ts` | Local `scoreFill` verdict + load-bearing Nouls + judge Choice → verdict |
| `src/lib/jev/typesafe/compose.test.ts` | Tests for the two `compose.ts` rules |
| `src/lib/jev/typesafe/contract.test.ts` | Contract tests. **Not present yet** |

Kernel (`operad.ts`, `colors.ts`, Rust WASM) is unchanged.
