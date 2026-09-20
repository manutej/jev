# JEV

A workbench for **what is allowed** and **what is useful**.

Colored operads map types to entities, concepts, and ideas. Masked-language
simulations check a fill against a port. Probability thresholds decide whether
composition ships. Applied from
[Libkind–Myers, arXiv:2505.18329](https://arxiv.org/abs/2505.18329).

Fail closed. Compose only on GREEN.

## Use

1. **Atlas** — walk the operadic tree. Open ports are dashed. Click a slot.
2. **Simulate** — pick a masked claim, fill the blank, score with the local
   lexicon (instant) or Grok (user-started).
3. **Gate** — inspect allowed vs toxin mass; move τ if you must.
4. **Runs** — replay the event-sourced workflow.

## Kernel

- TypeScript: `src/lib/jev/`
- Rust: `crates/jev-kernel`
- Doctrine notes: `docs/DOTS.md`

```sh
# TypeScript kernel tests (Node 22+)
node --experimental-strip-types --test src/lib/jev/operad.test.ts

# Rust kernel
cargo test --manifest-path crates/jev-kernel/Cargo.toml
```

## Lineage

This is not a clone of the paper’s formal development. It is an instrument:
type-safe γ, a small corpus of real-shaped claims, Brier calibration, and a
gate that will not plug a red fill into a live tree.
