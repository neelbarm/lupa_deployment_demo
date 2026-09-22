import { MODULE_MAP, ROLE_PATHS } from "../content/modules";
import type { AppState, Attempt, Benchmark, Clinic, Role, Staff } from "../types";

export const DAY = 86_400_000;

export function assignedModules(s: Staff): string[] {
  const path = ROLE_PATHS[s.role];
  return [...path, ...s.extraModules.filter((m) => !path.includes(m))];
}

export function attemptsFor(state: AppState, staffId: string, moduleId?: string): Attempt[] {
  return state.attempts.filter((a) => a.staffId === staffId && (!moduleId || a.moduleId === moduleId));
}

export type Proficiency = "mastered" | "proficient" | "retrain" | "in_progress" | "not_started";

export const PROFICIENCY_LABEL: Record<Proficiency, string> = {
  mastered: "Mastered",
  proficient: "Certified",
  retrain: "Needs retraining",
  in_progress: "In progress",
  not_started: "Not started",
};

export interface ModuleStatus {
  moduleId: string;
  proficiency: Proficiency;
  best?: Attempt;
  attempts: number;
  failedAttempts: number;
  firstTryPass: boolean;
  unlocked: boolean;
  /** Deadline for certification, spread across the training window. */
  dueDate: number;
  overdue: boolean;
}

/** Module i of n is due at an even share of the window from kickoff to 3 days before go-live. */
export function moduleDueDate(clinic: Clinic, index: number, total: number): number {
  const end = clinic.goLiveDate - 3 * DAY;
  return clinic.kickoffDate + ((end - clinic.kickoffDate) * (index + 1)) / Math.max(1, total);
}

export function moduleStatuses(state: AppState, s: Staff, now = Date.now()): ModuleStatus[] {
  const ids = assignedModules(s);
  const clinic = state.clinics.find((c) => c.id === s.clinicId)!;
  const mine = attemptsFor(state, s.id);
  let prevPassed = true;
  return ids.map((moduleId, i) => {
    const list = mine.filter((a) => a.moduleId === moduleId).sort((a, b) => a.finishedAt - b.finishedAt);
    const passed = list.filter((a) => a.passed && !a.superseded);
    const best = [...(passed.length ? passed : list)].sort((a, b) => b.score - a.score)[0];
    const inProg = state.progress.some((p) => p.staffId === s.id && p.moduleId === moduleId);
    let proficiency: Proficiency;
    if (passed.length) proficiency = best!.score >= 95 && best!.errors === 0 ? "mastered" : "proficient";
    else if (list.length) proficiency = "retrain";
    else if (inProg) proficiency = "in_progress";
    else proficiency = "not_started";
    const unlocked = prevPassed;
    prevPassed = prevPassed && passed.length > 0;
    const dueDate = moduleDueDate(clinic, i, ids.length);
    return {
      moduleId,
      proficiency,
      best,
      attempts: list.length,
      failedAttempts: list.filter((a) => !a.passed).length,
      firstTryPass: list.length > 0 && list[0].passed && !list[0].superseded,
      unlocked,
      dueDate,
      overdue: passed.length === 0 && now > dueDate,
    };
  });
}

export function isCertified(ms: ModuleStatus): boolean {
  return ms.proficiency === "mastered" || ms.proficiency === "proficient";
}

export interface StaffSummary {
  staff: Staff;
  modules: ModuleStatus[];
  certified: number;
  total: number;
  readiness: number; // 0-100
  avgScore: number | null;
  firstTryRate: number | null;
  totalMinutes: number;
  status: StaffStatus;
  nextModule?: string;
  overdue: number;
}

export type StaffStatus = "certified" | "on_track" | "behind" | "at_risk" | "not_started";

export const STATUS_LABEL: Record<StaffStatus, string> = {
  certified: "Go-live ready",
  on_track: "On track",
  behind: "Behind",
  at_risk: "At risk",
  not_started: "Not started",
};

/** Share of the training window elapsed; training should be done 3 days before go-live. */
export function expectedPace(clinic: Clinic, now: number): number {
  const end = clinic.goLiveDate - 3 * DAY;
  const span = Math.max(DAY, end - clinic.kickoffDate);
  return Math.min(1, Math.max(0, (now - clinic.kickoffDate) / span));
}

export function summarizeStaff(state: AppState, s: Staff, now = Date.now()): StaffSummary {
  const clinic = state.clinics.find((c) => c.id === s.clinicId)!;
  const modules = moduleStatuses(state, s, now);
  const certified = modules.filter(isCertified).length;
  const total = modules.length;
  const readiness = total ? Math.round((certified / total) * 100) : 0;
  const bests = modules.filter((m) => m.best && isCertified(m)).map((m) => m.best!.score);
  const avgScore = bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : null;
  const tried = modules.filter((m) => m.attempts > 0);
  const firstTryRate = tried.length ? Math.round((tried.filter((m) => m.firstTryPass).length / tried.length) * 100) : null;
  const totalMinutes = Math.round(attemptsFor(state, s.id).reduce((a, b) => a + b.durationSec, 0) / 60);

  const anyActivity = tried.length > 0 || state.progress.some((p) => p.staffId === s.id);
  const pace = expectedPace(clinic, now);
  const retrainHeavy = modules.some((m) => !isCertified(m) && m.failedAttempts >= 2);
  const daysToGoLive = (clinic.goLiveDate - now) / DAY;
  const inactiveDays = s.lastActiveAt ? (now - s.lastActiveAt) / DAY : Infinity;

  let status: StaffStatus;
  if (certified === total && total > 0) status = "certified";
  else if (!anyActivity) status = pace > 0.35 ? "at_risk" : "not_started";
  else if (retrainHeavy || modules.filter((m) => m.overdue).length >= 2 || (daysToGoLive < 10 && readiness < 50) || (inactiveDays > 6 && readiness < pace * 100))
    status = "at_risk";
  else if (readiness + 10 < pace * 100) status = "behind";
  else status = "on_track";

  return {
    staff: s,
    modules,
    certified,
    total,
    readiness,
    avgScore,
    firstTryRate,
    totalMinutes,
    status,
    nextModule: modules.find((m) => !isCertified(m))?.moduleId,
    overdue: modules.filter((m) => m.overdue).length,
  };
}

export function clinicStaff(state: AppState, clinicId: string): Staff[] {
  return state.staff.filter((s) => s.clinicId === clinicId);
}

export interface ClinicSummary {
  clinic: Clinic;
  staff: StaffSummary[];
  readiness: number;
  byRole: { role: Role; readiness: number; count: number }[];
  atRisk: number;
  certifiedStaff: number;
  started: number;
  benchmarks: BenchmarkResult[];
  daysToGoLive: number;
}

export function summarizeClinic(state: AppState, clinicId: string, now = Date.now()): ClinicSummary {
  const clinic = state.clinics.find((c) => c.id === clinicId)!;
  const staff = clinicStaff(state, clinicId).map((s) => summarizeStaff(state, s, now));
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const roles: Role[] = ["vet", "tech", "frontdesk", "manager"];
  return {
    clinic,
    staff,
    readiness: avg(staff.map((s) => s.readiness)),
    byRole: roles
      .map((role) => {
        const group = staff.filter((s) => s.staff.role === role);
        return { role, readiness: avg(group.map((s) => s.readiness)), count: group.length };
      })
      .filter((r) => r.count > 0),
    atRisk: staff.filter((s) => s.status === "at_risk").length,
    certifiedStaff: staff.filter((s) => s.status === "certified").length,
    started: staff.filter((s) => s.modules.some((m) => m.proficiency !== "not_started")).length,
    benchmarks: state.benchmarks.filter((b) => b.clinicId === clinicId).map((b) => evaluateBenchmark(b, staff, now)),
    daysToGoLive: Math.ceil((clinic.goLiveDate - now) / DAY),
  };
}

export type BenchmarkState = "met" | "on_track" | "at_risk" | "overdue";

export interface BenchmarkResult {
  benchmark: Benchmark;
  value: number;
  state: BenchmarkState;
  detail: string;
}

export function evaluateBenchmark(b: Benchmark, staff: StaffSummary[], now = Date.now()): BenchmarkResult {
  let value = 0;
  let detail = "";
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  if (b.kind === "started") {
    const n = staff.filter((s) => s.modules.some((m) => m.proficiency !== "not_started")).length;
    value = pct(n, staff.length);
    detail = `${n} of ${staff.length} staff have started training`;
  } else if (b.kind === "readiness") {
    value = staff.length ? Math.round(staff.reduce((a, s) => a + s.readiness, 0) / staff.length) : 0;
    detail = `Clinic readiness is ${value}%`;
  } else if (b.kind === "role_cert") {
    const group = staff.filter((s) => s.staff.role === b.role);
    const n = group.filter((s) => s.status === "certified").length;
    value = pct(n, group.length);
    detail = `${n} of ${group.length} fully certified`;
  } else if (b.kind === "module_cert") {
    const group = staff.filter((s) => s.modules.some((m) => m.moduleId === b.moduleId) && (!b.role || s.staff.role === b.role));
    const n = group.filter((s) => s.modules.some((m) => m.moduleId === b.moduleId && isCertified(m))).length;
    value = pct(n, group.length);
    detail = `${n} of ${group.length} certified on ${MODULE_MAP[b.moduleId!]?.title ?? b.moduleId}`;
  }
  let state: BenchmarkState;
  if (value >= b.target) state = "met";
  else if (now > b.dueDate) state = "overdue";
  else if (b.dueDate - now < 5 * DAY) state = "at_risk";
  else state = "on_track";
  return { benchmark: b, value, state, detail };
}

export interface MissedStep {
  moduleId: string;
  stepId: string;
  count: number;
  people: number;
  topWrong?: string;
}

/** Aggregate simulation mistakes: which workflow steps trip up this clinic's staff most. */
export function missedSteps(state: AppState, clinicId: string): MissedStep[] {
  const ids = new Set(clinicStaff(state, clinicId).map((s) => s.id));
  const map = new Map<string, { count: number; people: Set<string>; wrong: Map<string, number> }>();
  for (const a of state.attempts) {
    if (!ids.has(a.staffId)) continue;
    for (const m of a.mistakes) {
      const key = `${a.moduleId}::${m.stepId}`;
      const e = map.get(key) ?? { count: 0, people: new Set(), wrong: new Map() };
      e.count++;
      e.people.add(a.staffId);
      e.wrong.set(m.clicked, (e.wrong.get(m.clicked) ?? 0) + 1);
      map.set(key, e);
    }
  }
  return [...map.entries()]
    .map(([key, e]) => {
      const [moduleId, stepId] = key.split("::");
      const topWrong = [...e.wrong.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return { moduleId, stepId, count: e.count, people: e.people.size, topWrong };
    })
    .sort((a, b) => b.count - a.count);
}

export function quizMisses(state: AppState, clinicId: string): { moduleId: string; questionId: string; count: number }[] {
  const ids = new Set(clinicStaff(state, clinicId).map((s) => s.id));
  const map = new Map<string, number>();
  for (const a of state.attempts) {
    if (!ids.has(a.staffId)) continue;
    for (const q of a.quizMisses) map.set(`${a.moduleId}::${q}`, (map.get(`${a.moduleId}::${q}`) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([k, count]) => {
      const [moduleId, questionId] = k.split("::");
      return { moduleId, questionId, count };
    })
    .sort((a, b) => b.count - a.count);
}

/** Human label for the element a learner clicked by mistake. */
export function elementLabel(moduleId: string, elementId: string): string {
  if (elementId.startsWith("nav:")) return `${cap(elementId.slice(4))} (sidebar)`;
  if (elementId.startsWith("value:")) return `entered “${elementId.slice(6)}”`;
  const m = MODULE_MAP[moduleId];
  if (!m) return elementId;
  for (const sc of m.sim.screens)
    for (const sec of sc.sections)
      for (const it of sec.items) {
        if ("id" in it && it.id === elementId) {
          if (it.kind === "row") return it.cells[0];
          return it.label;
        }
      }
  return elementId;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function relTime(ts: number | undefined, now = Date.now()): string {
  if (!ts) return "never";
  const d = now - ts;
  if (d < 45_000) return "just now";
  if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`;
  if (d < DAY) return `${Math.round(d / 3_600_000)}h ago`;
  const days = Math.round(d / DAY);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
