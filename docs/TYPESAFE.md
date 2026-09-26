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
- Mid-band Noul (0.4–0.6) on a load-bearing seat → AMBER
- Judge Choice cannot override a local RED
- TypeSafe confidence does not write τ
- Effects: Vercel / workbench. This package does not fetch.

## Files on the tree

| File | Role |
| --- | --- |
| `src/lib/jev/typesafe/contract.ts` | Request/response types + validators |
| `src/lib/jev/typesafe/index.ts` | Re-exports the contract |

`from-seats.ts`, `compose.ts`, and `contract.test.ts` are not on main yet.
Kernel now includes product juxtaposition (`product_ports` / `fp/product.ts`).
