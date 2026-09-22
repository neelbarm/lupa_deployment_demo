/** Scoring rules shared by the learner player, seed data and tests. */

export const QUIZ_GATE = 67; // % needed on the knowledge check to unlock the simulation
export const QUIZ_WEIGHT = 0.3;
export const SIM_WEIGHT = 0.7;
export const ERROR_PENALTY = 8;
export const HINT_PENALTY = 12;

export function quizScore(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

export function simScore(errors: number, hints: number): number {
  return Math.max(0, 100 - errors * ERROR_PENALTY - hints * HINT_PENALTY);
}

export function moduleScore(quiz: number, sim: number): number {
  return Math.round(quiz * QUIZ_WEIGHT + sim * SIM_WEIGHT);
}

/** Compare a learner's typed/selected value with the expected one. */
export function valueMatches(given: string, expected: string): boolean {
  const g = given.trim().toLowerCase();
  const e = expected.trim().toLowerCase();
  if (g === e) return true;
  const gn = Number(g.replace(/[^\d.-]/g, ""));
  const en = Number(e.replace(/[^\d.-]/g, ""));
  if (g !== "" && /\d/.test(g) && /^[\d.\s-]+$/.test(e) && Number.isFinite(gn) && Number.isFinite(en)) {
    return Math.abs(gn - en) < 0.051;
  }
  return false;
}
