# Applied double operadic theory (JEV)

This workbench is an applied reading of Sophie Libkind and David Jaz Myers,
[Towards a double operadic theory of systems](https://arxiv.org/abs/2505.18329)
(arXiv:2505.18329).

## What we took from the paper

DOTS treats **systems as loose right modules** over a double category of
interfaces and interactions. Three doctrines appear as the generators of that
double category:

| Doctrine | Interface shape | Composition | In JEV |
| --- | --- | --- | --- |
| Port-plugging | cospans | pushout | Glue open ports of the same color |
| Variable sharing | spans | pullback | Identify the same entity along two views |
| Generalized Moore machines | lenses | diamond | Readout forward, update backward |

Wiring diagrams and diagrammatic patterns are **free processes** in a doctrine.
We render those processes as **colored operadic trees**.

## What JEV adds

1. **Colors as types.** Five interface colors — entity, concept, idea, evidence,
   action — are the operad colors. An operation has an output color and an input
   profile. Composition γ is defined only on a color match. That is the type
   checker: a claim cannot occupy an evidence port.
2. **Masked-language simulations.** A fill of `[MASK]` is a proposed inhabitant
   of a port. Local lexicon or Grok produces a distribution over colors. The
   distribution is scored against the port (allowed vs toxin).
3. **Probability thresholds.** GREEN ships; AMBER and RED fail closed. Toxin
   mass above τ_t is always RED. The human remains at the irreversible boundary.
4. **Durable runs.** Each score is a Temporal-shaped workflow: keyed, event
   sourced, replayable. One intent, one effect.

## Hybrid

The live workbench is TypeScript (Temporal-shaped workflows + React). The same
kernel is expressed in Rust (`crates/jev-kernel`) so a later Leptos island can
own the hot path without changing the doctrine.
