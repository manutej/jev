# JEV eval pack

Runnable locally. Does not call TypeSafe.

```bash
# from manutej/jev
node --experimental-strip-types --test src/lib/jev/operad.test.ts src/lib/jev/questions.test.ts
```

What this proves tonight:

| Claim | File |
| --- | --- |
| 100 questions / concept | `questions.ts` `generateQuestions` |
| 16-seat one-query fill pinned to `jev-1.13.0` | `seats.ts` `buildFillQuery` |
| Fail-closed toxin and mid-band | `score.ts` via E1 / E7 |
| Buyer metric present, not `accuracy` | E12 |

What this does **not** prove:

- A live 16-seat call against `jev-1.13.0` (needs `TYPESAFE_API_KEY` on the decision plane, not in this kernel).
- Hand-authored essays. Items are template-bound to `CONCEPTS`.
- Elder `sheaf/lattice.json` residualMeaning (E16) — that file is still missing on the collector.

Original Simulate corpus `c1–c8` in `corpus.ts` is still the gold MLM fixture.
