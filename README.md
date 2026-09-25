# JEV

A workbench for **what is allowed** and **what is useful**.

Colored operads map types to entities, concepts, and ideas. Cospans glue
systems along a shared color (pushout). Spans identify a shared variable
(pullback). Masked-language simulations check a fill against a port.
Probability thresholds decide whether composition ships.

Applied from
[Libkind–Myers, arXiv:2505.18329](https://arxiv.org/abs/2505.18329).

Fail closed. Compose only on GREEN.

**Three Jevs — do not fuse.** This repo, manutej/jev, is the operad **kernel
workbench**. It is not **TypeSafe Jev**, the hosted model (pinned `jev-1.13.0`),
and it is not **jev-domain**, the Digest Rust crate of Item/Command/Clarify
types. The shared contract and naming live in [`.jev/README.md`](.jev/README.md).

## Architecture

Four layers. Two effects.

1. **Doctrine** — cospan / span / lens
2. **Colored operad** — five colors, γ only on a match
3. **FP kernel** — pure `Result`, no IO (`src/lib/jev/fp`)
4. **Rust** — the same algebra, WASM (`crates/jev-kernel`)

Outside the kernel: Temporal-shaped runs (in-memory in `temporal.ts`), and
Grok only on a click. *Grok: not present in this repo.*

See `docs/ARCHITECTURE.md`.

## Use

*Not present in this repo:* the React workbench these views describe. This repo
holds the TypeScript library (`src/lib/jev`), the Rust crate and a prebuilt
`public/jev_kernel.wasm`. Tests: `npm test`.

1. **Live** — pushout and pullback on two real-shaped systems. Watch the kernel.
2. **Atlas** — walk the operadic tree. Open ports are dashed. Click a slot.
3. **Simulate** — pick a masked claim, fill the blank, score locally or with Grok.
4. **Gate** — inspect allowed vs toxin mass; move τ if you must.
5. **Runs** — replay the event-sourced workflow.
