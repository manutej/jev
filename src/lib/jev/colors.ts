/** Interface colors of the JEV operad — types as ports. */

export const COLORS = ["entity", "concept", "idea", "evidence", "action"] as const;
export type Color = (typeof COLORS)[number];

export const COLOR_META: Record<
  Color,
  { label: string; short: string; token: string; blurb: string }
> = {
  entity: {
    label: "Entity",
    short: "E",
    token: "var(--jev-entity)",
    blurb: "Named things: places, tables, people, tokens.",
  },
  concept: {
    label: "Concept",
    short: "C",
    token: "var(--jev-concept)",
    blurb: "Interfaces, doctrines, types, modules.",
  },
  idea: {
    label: "Idea",
    short: "I",
    token: "var(--jev-idea)",
    blurb: "Hypotheses, claims, theories.",
  },
  evidence: {
    label: "Evidence",
    short: "V",
    token: "var(--jev-evidence)",
    blurb: "Queries, counts, extents, OCR, catalogs.",
  },
  action: {
    label: "Action",
    short: "A",
    token: "var(--jev-action)",
    blurb: "Publish, compose, drop, grant, schedule.",
  },
};

export function isColor(value: string): value is Color {
  return (COLORS as readonly string[]).includes(value);
}
