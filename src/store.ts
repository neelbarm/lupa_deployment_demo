import { useSyncExternalStore } from "react";
import { MODULE_MAP } from "./content/modules";
import { createSeed, SPECIALIST, STATE_VERSION, synthAttempt } from "./data/seed";
import { assignedModules, moduleStatuses } from "./logic/metrics";
import type { ActivityEvent, AppState, Attempt, InProgress, Note, NoteKind, Role, Stage } from "./types";

/**
 * Local-first store. State lives in localStorage and every change is broadcast
 * over BroadcastChannel, so the Deployment Console and Clinic Academy update
 * live across panes, tabs and windows of the same browser.
 */

const KEY = "lupa-academy-state";
const CHANNEL = "lupa-academy-sync";

type Listener = () => void;
const listeners = new Set<Listener>();

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    /* storage unavailable: fall through to a fresh seed */
  }
  return createSeed();
}

let state: AppState = load();
let lastRemoteAt = 0;

let channel: BroadcastChannel | null = null;
try {
  channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
} catch {
  channel = null;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / privacy mode */
  }
}

function emit() {
  for (const l of listeners) l();
}

function applyRemote(next: AppState) {
  state = next;
  lastRemoteAt = Date.now();
  emit();
}

channel?.addEventListener("message", (e: MessageEvent) => {
  if (e.data?.type === "state" && e.data.state?.version === STATE_VERSION) applyRemote(e.data.state);
});

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        applyRemote(JSON.parse(e.newValue));
      } catch {
        /* ignore */
      }
    }
  });
  persist();
}

function commit(mutate: (draft: AppState) => void) {
  const draft = structuredClone(state);
  mutate(draft);
  draft.events.sort((a, b) => b.ts - a.ts);
  if (draft.events.length > 600) draft.events.length = 600;
  state = draft;
  persist();
  try {
    channel?.postMessage({ type: "state", state });
  } catch {
    /* ignore */
  }
  emit();
}

export function getState() {
  return state;
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state);
}

export function lastRemoteUpdate() {
  return lastRemoteAt;
}

/* ---------------- helpers ---------------- */

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function pushEvent(d: AppState, e: Omit<ActivityEvent, "id" | "ts"> & { ts?: number }) {
  d.events.unshift({ ts: Date.now(), ...e, id: uid("e") });
}

function staffOf(d: AppState, staffId: string) {
  const s = d.staff.find((x) => x.id === staffId);
  if (!s) throw new Error(`Unknown staff ${staffId}`);
  return s;
}

/* ---------------- learner actions ---------------- */

const STAGE_LABEL: Record<Stage, string> = {
  compare: "comparing old vs. new workflow",
  lesson: "reading the lesson",
  quiz: "taking the knowledge check",
  sim: "in the hands-on simulation",
  result: "reviewing results",
};

export const actions = {
  learnerLogin(staffId: string) {
    commit((d) => {
      const s = staffOf(d, staffId);
      const recent = d.events.find((e) => e.staffId === staffId && e.type === "login" && Date.now() - e.ts < 10 * 60_000);
      s.lastActiveAt = Date.now();
      if (!recent) pushEvent(d, { clinicId: s.clinicId, staffId, type: "login", text: `${s.name} opened Lupa Academy` });
    });
  },

  startModule(staffId: string, moduleId: string) {
    commit((d) => {
      const s = staffOf(d, staffId);
      s.lastActiveAt = Date.now();
      d.progress = d.progress.filter((p) => !(p.staffId === staffId && p.moduleId === moduleId));
      d.progress.push({ staffId, moduleId, stage: "compare", startedAt: Date.now(), updatedAt: Date.now() });
      const dup = d.events.find((e) => e.type === "started" && e.staffId === staffId && e.moduleId === moduleId && Date.now() - e.ts < 3000);
      if (!dup) pushEvent(d, { clinicId: s.clinicId, staffId, moduleId, type: "started", text: `${s.name} started “${MODULE_MAP[moduleId].title}”` });
    });
  },

  setStage(staffId: string, moduleId: string, stage: Stage, extra: Partial<InProgress> = {}) {
    commit((d) => {
      const s = staffOf(d, staffId);
      s.lastActiveAt = Date.now();
      let p = d.progress.find((x) => x.staffId === staffId && x.moduleId === moduleId);
      if (!p) {
        p = { staffId, moduleId, stage, startedAt: Date.now(), updatedAt: Date.now() };
        d.progress.push(p);
      }
      const changed = p.stage !== stage;
      Object.assign(p, { stage, updatedAt: Date.now() }, extra);
      if (changed)
        pushEvent(d, { clinicId: s.clinicId, staffId, moduleId, type: "stage", text: `${s.name} is ${STAGE_LABEL[stage]} · ${MODULE_MAP[moduleId].title}` });
    });
  },

  recordQuiz(staffId: string, moduleId: string, score: number, passedGate: boolean) {
    commit((d) => {
      const s = staffOf(d, staffId);
      s.lastActiveAt = Date.now();
      pushEvent(d, {
        clinicId: s.clinicId,
        staffId,
        moduleId,
        type: "quiz",
        text: passedGate
          ? `${s.name} scored ${score}% on the ${MODULE_MAP[moduleId].title} knowledge check`
          : `${s.name} scored ${score}% on the ${MODULE_MAP[moduleId].title} knowledge check. Must retake before the simulation`,
      });
    });
  },

  recordSimError(staffId: string, moduleId: string, stepIndex: number, errors: number, instruction: string) {
    commit((d) => {
      const s = staffOf(d, staffId);
      s.lastActiveAt = Date.now();
      const p = d.progress.find((x) => x.staffId === staffId && x.moduleId === moduleId);
      if (p) Object.assign(p, { simStep: stepIndex, simErrors: errors, updatedAt: Date.now() });
      pushEvent(d, {
        clinicId: s.clinicId,
        staffId,
        moduleId,
        type: "sim_error",
        text: `${s.name} made a wrong move at step ${stepIndex + 1}: “${instruction}”`,
      });
    });
  },

  recordSimStep(staffId: string, moduleId: string, stepIndex: number, errors: number) {
    commit((d) => {
      const p = d.progress.find((x) => x.staffId === staffId && x.moduleId === moduleId);
      if (p) Object.assign(p, { simStep: stepIndex, simErrors: errors, updatedAt: Date.now() });
      const s = staffOf(d, staffId);
      s.lastActiveAt = Date.now();
    });
  },

  submitAttempt(a: Omit<Attempt, "id">) {
    commit((d) => {
      const s = staffOf(d, a.staffId);
      s.lastActiveAt = Date.now();
      d.attempts.push({ ...a, id: uid("a") });
      d.progress = d.progress.filter((p) => !(p.staffId === a.staffId && p.moduleId === a.moduleId));
      const title = MODULE_MAP[a.moduleId].title;
      pushEvent(d, {
        clinicId: s.clinicId,
        staffId: a.staffId,
        moduleId: a.moduleId,
        type: a.passed ? "passed" : "failed",
        text: a.passed
          ? `${s.name} passed “${title}” with ${a.score}%${a.errors === 0 ? " · zero workflow errors" : ""}`
          : `${s.name} did not pass “${title}” (${a.score}%, needs ${MODULE_MAP[a.moduleId].passScore}%). Retake required`,
      });
    });
  },

  markReminderRead(id: string) {
    commit((d) => {
      const r = d.reminders.find((x) => x.id === id);
      if (!r || r.readAt) return;
      r.readAt = Date.now();
      const s = staffOf(d, r.staffId);
      pushEvent(d, { clinicId: r.clinicId, staffId: r.staffId, type: "reminder_read", text: `${s.name} read your reminder` });
    });
  },

  /* ---------------- deployment team actions ---------------- */

  sendReminder(staffIds: string[], message: string, moduleId?: string) {
    commit((d) => {
      for (const staffId of staffIds) {
        const s = staffOf(d, staffId);
        d.reminders.push({ id: uid("r"), clinicId: s.clinicId, staffId, ts: Date.now(), from: SPECIALIST, message: personalize(message, s.name), moduleId });
        pushEvent(d, { clinicId: s.clinicId, staffId, type: "reminder", text: `Reminder sent to ${s.name}` });
      }
    });
  },

  assignModule(staffId: string, moduleId: string) {
    commit((d) => {
      const s = staffOf(d, staffId);
      if (assignedModules(s).includes(moduleId)) return;
      s.extraModules.push(moduleId);
      pushEvent(d, { clinicId: s.clinicId, staffId, moduleId, type: "assigned", text: `“${MODULE_MAP[moduleId].title}” assigned to ${s.name}` });
    });
  },

  unassignModule(staffId: string, moduleId: string) {
    commit((d) => {
      const s = staffOf(d, staffId);
      s.extraModules = s.extraModules.filter((m) => m !== moduleId);
    });
  },

  requireRecert(staffId: string, moduleId: string) {
    commit((d) => {
      const s = staffOf(d, staffId);
      // Keep history for audit; earlier passes stop counting towards certification.
      for (const a of d.attempts) if (a.staffId === staffId && a.moduleId === moduleId && a.passed) a.superseded = true;
      pushEvent(d, {
        clinicId: s.clinicId,
        staffId,
        moduleId,
        type: "recert",
        text: `Recertification required: ${s.name} must retake “${MODULE_MAP[moduleId].title}”`,
      });
    });
  },

  addNote(clinicId: string, kind: NoteKind, text: string, staffId?: string) {
    commit((d) => {
      const n: Note = { id: uid("n"), clinicId, staffId, ts: Date.now(), author: SPECIALIST, kind, text };
      d.notes.unshift(n);
      pushEvent(d, { clinicId, staffId, type: "note", text: `${KIND_LABEL[kind]} logged${staffId ? ` for ${staffOf(d, staffId).name}` : ""}` });
    });
  },

  addStaff(clinicId: string, name: string, role: Role, email: string) {
    commit((d) => {
      const id = uid(`${clinicId}-staff`);
      d.staff.push({ id, clinicId, name, role, email, invitedAt: Date.now(), extraModules: [] });
      pushEvent(d, { clinicId, staffId: id, type: "staff_added", text: `${name} invited to Lupa Academy (${role === "frontdesk" ? "front desk" : role})` });
    });
  },

  setBenchmarkTarget(id: string, target: number) {
    commit((d) => {
      const b = d.benchmarks.find((x) => x.id === id);
      if (b) b.target = target;
    });
  },

  resetDemo() {
    commit((d) => {
      Object.assign(d, createSeed());
    });
  },

  /** Advance a random learner at a clinic, to demo the live feed without a second person. */
  simulateTick(clinicId: string) {
    commit((d) => {
      const pool = d.staff.filter((s) => s.clinicId === clinicId);
      const candidates = pool
        .map((s) => ({ s, ms: moduleStatuses(d, s) }))
        .filter(({ ms }) => ms.some((m) => m.proficiency !== "mastered" && m.proficiency !== "proficient"));
      if (!candidates.length) return;
      const { s, ms } = candidates[Math.floor(Math.random() * candidates.length)];
      const next = ms.find((m) => m.proficiency !== "mastered" && m.proficiency !== "proficient")!;
      const mod = MODULE_MAP[next.moduleId];
      const prog = d.progress.find((p) => p.staffId === s.id && p.moduleId === next.moduleId);
      s.lastActiveAt = Date.now();
      if (!prog) {
        d.progress.push({ staffId: s.id, moduleId: mod.id, stage: "lesson", startedAt: Date.now(), updatedAt: Date.now() });
        pushEvent(d, { clinicId, staffId: s.id, moduleId: mod.id, type: "started", text: `${s.name} started “${mod.title}”` });
        return;
      }
      if (prog.stage !== "sim") {
        prog.stage = "sim";
        prog.simStep = 0;
        pushEvent(d, { clinicId, staffId: s.id, moduleId: mod.id, type: "stage", text: `${s.name} is ${STAGE_LABEL.sim} · ${mod.title}` });
        return;
      }
      if (Math.random() < 0.35) {
        const step = mod.sim.steps[Math.floor(Math.random() * mod.sim.steps.length)];
        pushEvent(d, { clinicId, staffId: s.id, moduleId: mod.id, type: "sim_error", text: `${s.name} made a wrong move: “${step.instruction}”` });
        return;
      }
      const skill = 0.45 + Math.random() * 0.5;
      const fail = Math.random() < 0.25;
      const a = synthAttempt(Math.random, s.id, mod.id, skill, Date.now(), fail);
      d.attempts.push({ ...a, id: uid("a") });
      d.progress = d.progress.filter((p) => p !== prog);
      pushEvent(d, {
        clinicId,
        staffId: s.id,
        moduleId: mod.id,
        type: a.passed ? "passed" : "failed",
        text: a.passed ? `${s.name} passed “${mod.title}” with ${a.score}%` : `${s.name} did not pass “${mod.title}” (${a.score}%). Retake required`,
      });
    });
  },
};

export const KIND_LABEL: Record<NoteKind, string> = {
  call: "Call",
  training: "Training session",
  email: "Email",
  note: "Note",
};

/** "Dr. Sarah Chen" → "Dr. Chen", "Jess Morales" → "Jess". */
export function greetingName(name: string) {
  return name.startsWith("Dr.") ? `Dr. ${name.split(" ").slice(-1)[0]}` : name.split(" ")[0];
}

function personalize(msg: string, name: string) {
  return msg.replaceAll("{name}", greetingName(name));
}
