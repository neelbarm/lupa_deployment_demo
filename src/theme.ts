import { useSyncExternalStore } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "lupa-academy-theme";
const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage unavailable */
  }
  return "light";
}

let choice: ThemeChoice = read();

/** Stamp the choice on <html>; "system" leaves it unset so prefers-color-scheme decides. */
export function applyTheme(next: ThemeChoice = choice) {
  choice = next;
  const root = document.documentElement;
  if (next === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", next);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => choice,
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) applyTheme(read());
  });
}
