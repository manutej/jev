# JEV architecture

Four layers. Two effects. Nothing else.

```
Workbench (React)
    │  calls
    ▼
FP kernel          pure Result, no IO
    │  twins
    ├─ TypeScript     src/lib/jev/fp
    └─ Rust WASM      crates/jev-kernel
           │
           ├─ cospan / pushout     port-plugging
           ├─ span / pullback      variable sharing
           ├─ operad γ             typed trees
           └─ score_fill           fail-closed gate

Effects (outside the kernel)
    ├─ Temporal-shaped event log
    └─ Grok mask  — user-started only
```

The kernel does not fetch, store, or wait. The workbench does.

Composition ships only when the gate is GREEN.
