import type { SimItem } from "../types";

type Vis = { showAfter?: string; hideAfter?: string };

export const btn = (id: string, label: string, variant: "primary" | "ghost" | "danger" = "ghost", vis: Vis = {}): SimItem => ({
  kind: "button",
  id,
  label,
  variant,
  ...vis,
});
export const sel = (id: string, label: string, options: string[], vis: Vis = {}): SimItem => ({
  kind: "select",
  id,
  label,
  options,
  ...vis,
});
export const inp = (id: string, label: string, placeholder = "", vis: Vis = {}): SimItem => ({
  kind: "input",
  id,
  label,
  placeholder,
  ...vis,
});
export const row = (id: string, cells: string[], badge?: string, vis: Vis = {}): SimItem => ({
  kind: "row",
  id,
  cells,
  badge,
  ...vis,
});
export const txt = (
  text: string,
  tone?: "muted" | "ai" | "warn" | "success" | "strong",
  vis: Vis = {},
): SimItem => ({ kind: "text", text, tone, ...vis });
export const kv = (pairs: [string, string][], vis: Vis = {}): SimItem => ({ kind: "kv", pairs, ...vis });

export const after = (step: string): Vis => ({ showAfter: step });
export const until = (step: string): Vis => ({ hideAfter: step });
