import { MODULE_MAP, ROLE_PATHS } from "../content/modules";
import { moduleScore, quizScore, simScore } from "../logic/scoring";
import { DAY } from "../logic/metrics";
import type { ActivityEvent, AppState, Attempt, Benchmark, Clinic, Note, Reminder, Role, Staff } from "../types";

export const STATE_VERSION = 5;

/** The Lupa deployment specialist shown throughout the console. Change to your own name. */
export const SPECIALIST = "Neel Barmecha";

/** Small deterministic PRNG so every fresh demo looks identical. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface StaffSpec {
  name: string;
  role: Role;
  /** Number of path modules passed. */
  done: number;
  /** 0 = struggles, 1 = sharp. Drives errors/hints. */
  skill: number;
  /** Failed attempts on the module after the last passed one (currently stuck). */
  stuckFails?: number;
  /** Extra failed attempts before passing, keyed by module id. */
  retries?: Record<string, number>;
  lastActiveDays?: number;
  /** Currently mid-module (not yet submitted). */
  inProgress?: boolean;
}

interface ClinicSpec {
  clinic: Omit<Clinic, "kickoffDate" | "goLiveDate"> & { kickoffDaysAgo: number; goLiveInDays: number };
  staff: StaffSpec[];
}

const CLINICS: ClinicSpec[] = [
  {
    clinic: {
      id: "riverside",
      name: "Riverside Animal Hospital",
      city: "Austin, TX",
      legacyPims: "Cornerstone",
      specialist: SPECIALIST,
      contactName: "Diane Foster",
      contactRole: "Practice Manager",
      stage: "Training",
      kickoffDaysAgo: 12,
      goLiveInDays: 9,
    },
    staff: [
      { name: "Dr. Sarah Chen", role: "vet", done: 3, skill: 0.85, lastActiveDays: 0.2 },
      { name: "Dr. Raj Patel", role: "vet", done: 2, skill: 0.35, stuckFails: 2, lastActiveDays: 1 },
      { name: "Dr. Amara Okoro", role: "vet", done: 0, skill: 0.7 },
      { name: "Sam Whitfield", role: "tech", done: 4, skill: 0.9, lastActiveDays: 0.1 },
      { name: "Priya Nair", role: "tech", done: 2, skill: 0.6, lastActiveDays: 2, inProgress: true },
      { name: "Tom Becker", role: "tech", done: 1, skill: 0.5, lastActiveDays: 8 },
      { name: "Olivia Grant", role: "frontdesk", done: 5, skill: 0.95, lastActiveDays: 1 },
      { name: "Marcus Hill", role: "frontdesk", done: 3, skill: 0.55, retries: { checkout: 1 }, lastActiveDays: 0.5 },
      { name: "Hannah Lee", role: "frontdesk", done: 2, skill: 0.7, lastActiveDays: 3 },
      { name: "Jess Morales", role: "frontdesk", done: 0, skill: 0.7 },
      { name: "Diane Foster", role: "manager", done: 3, skill: 0.8, lastActiveDays: 0.3 },
    ],
  },
  {
    clinic: {
      id: "oakpaw",
      name: "Oak & Paw Veterinary Group",
      city: "Denver, CO · 2 sites",
      legacyPims: "ezyVet",
      specialist: SPECIALIST,
      contactName: "Luis Romero",
      contactRole: "Group Operations Lead",
      stage: "Configuration",
      kickoffDaysAgo: 3,
      goLiveInDays: 26,
    },
    staff: [
      { name: "Dr. Emily Hart", role: "vet", done: 1, skill: 0.8, lastActiveDays: 0.5 },
      { name: "Dr. Kwame Mensah", role: "vet", done: 0, skill: 0.6 },
      { name: "Dr. Nora Blake", role: "vet", done: 1, skill: 0.55, lastActiveDays: 1, inProgress: true },
      { name: "Leah Kim", role: "tech", done: 1, skill: 0.75, lastActiveDays: 1 },
      { name: "Diego Alvarez", role: "tech", done: 0, skill: 0.6 },
      { name: "Chloe Martin", role: "frontdesk", done: 2, skill: 0.85, lastActiveDays: 0.2 },
      { name: "Ben Carter", role: "frontdesk", done: 0, skill: 0.5 },
      { name: "Grace Liu", role: "frontdesk", done: 1, skill: 0.6, lastActiveDays: 2 },
      { name: "Luis Romero", role: "manager", done: 1, skill: 0.8, lastActiveDays: 0.4 },
    ],
  },
  {
    clinic: {
      id: "coastal",
      name: "Coastal Pet Clinic",
      city: "San Diego, CA",
      legacyPims: "AVImark",
      specialist: SPECIALIST,
      contactName: "Rachel Moore",
      contactRole: "Clinic Owner, DVM",
      stage: "Go-live",
      kickoffDaysAgo: 24,
      goLiveInDays: 3,
    },
    staff: [
      { name: "Dr. Rachel Moore", role: "vet", done: 5, skill: 0.9, lastActiveDays: 1 },
      { name: "Dr. Ian Ross", role: "vet", done: 4, skill: 0.6, stuckFails: 1, lastActiveDays: 0.3 },
      { name: "Maya Singh", role: "tech", done: 5, skill: 0.85, lastActiveDays: 2 },
      { name: "Owen Price", role: "tech", done: 5, skill: 0.7, retries: { tasks: 1 }, lastActiveDays: 1 },
      { name: "Ava Torres", role: "frontdesk", done: 5, skill: 0.9, lastActiveDays: 1 },
      { name: "Noah Evans", role: "frontdesk", done: 4, skill: 0.65, lastActiveDays: 0.6 },
      { name: "Zoe Clarke", role: "manager", done: 6, skill: 0.95, lastActiveDays: 3 },
    ],
  },
  {
    clinic: {
      id: "harbor",
      name: "Harborview Veterinary Center",
      city: "Seattle, WA",
      legacyPims: "Cornerstone",
      specialist: SPECIALIST,
      contactName: "Paul Nguyen",
      contactRole: "Practice Manager",
      stage: "Hypercare",
      kickoffDaysAgo: 52,
      goLiveInDays: -21,
    },
    staff: [
      { name: "Dr. Helen Park", role: "vet", done: 5, skill: 0.9, lastActiveDays: 12 },
      { name: "Dr. Marco Silva", role: "vet", done: 5, skill: 0.75, retries: { scribe: 1 }, lastActiveDays: 15 },
      { name: "Kara Jensen", role: "tech", done: 5, skill: 0.8, lastActiveDays: 14 },
      { name: "Eli Brooks", role: "frontdesk", done: 5, skill: 0.85, lastActiveDays: 13 },
      { name: "Sofia Ramos", role: "frontdesk", done: 5, skill: 0.7, retries: { checkout: 1 }, lastActiveDays: 16 },
      { name: "Paul Nguyen", role: "manager", done: 6, skill: 0.9, lastActiveDays: 11 },
    ],
  },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/^dr\.\s*/, "")
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "");

/** Build a realistic attempt for a module, with mistakes drawn from real simulation steps. */
export function synthAttempt(
  r: () => number,
  staffId: string,
  moduleId: string,
  skill: number,
  finishedAt: number,
  forceFail: boolean,
): Attempt {
  const m = MODULE_MAP[moduleId];
  const qTotal = m.quiz.length;
  const steps = m.sim.steps;
  let errors: number;
  let hints: number;
  let qCorrect: number;
  if (forceFail) {
    errors = 3 + Math.floor(r() * 3);
    hints = 1 + Math.floor(r() * 2);
    qCorrect = Math.max(Math.ceil(qTotal * 0.67), qTotal - 1);
  } else {
    const lapse = 1 - skill;
    errors = Math.floor(r() * (lapse * 4 + 0.6));
    hints = r() < lapse * 0.5 ? 1 : 0;
    qCorrect = r() < skill + 0.15 ? qTotal : qTotal - 1;
    // keep a genuine pass
    while (moduleScore(quizScore(qCorrect, qTotal), simScore(errors, hints)) < m.passScore) {
      if (hints > 0) hints--;
      else if (errors > 0) errors--;
      else qCorrect = qTotal;
    }
  }
  const qs = quizScore(qCorrect, qTotal);
  const ss = simScore(errors, hints);
  const score = moduleScore(qs, ss);
  const mistakes: Attempt["mistakes"] = [];
  for (let i = 0; i < errors; i++) {
    // Mistakes cluster on steps that have known "tempting" wrong answers.
    const tricky = steps.filter((s) => s.wrong && Object.keys(s.wrong).length);
    const pool = tricky.length && r() < 0.75 ? tricky : steps;
    const step = pool[Math.floor(r() * pool.length)];
    const wrongKeys = step.wrong ? Object.keys(step.wrong) : [];
    let clicked: string;
    if (wrongKeys.length) clicked = wrongKeys[Math.floor(r() * wrongKeys.length)];
    else if (step.value) clicked = "value:" + (step.value.match(/^[\d.]+$/) ? String(Number(step.value) * 2) : "wrong option");
    else clicked = ["nav:home", "nav:calendar", "nav:messages"][Math.floor(r() * 3)];
    mistakes.push({ stepId: step.id, clicked });
  }
  const quizMisses = m.quiz
    .map((q) => q.id)
    .sort(() => r() - 0.5)
    .slice(0, qTotal - qCorrect);
  const durationSec = Math.round(m.minutes * 60 * (0.7 + r() * 0.8) + errors * 25);
  return {
    id: `a-${staffId}-${moduleId}-${finishedAt}`,
    staffId,
    moduleId,
    startedAt: finishedAt - durationSec * 1000,
    finishedAt,
    quizScore: qs,
    simScore: ss,
    score,
    passed: !forceFail && score >= m.passScore,
    errors,
    hints,
    durationSec,
    mistakes,
    quizMisses,
  };
}

export function createSeed(now = Date.now()): AppState {
  const r = rng(20260922);
  const state: AppState = {
    version: STATE_VERSION,
    clinics: [],
    staff: [],
    attempts: [],
    progress: [],
    events: [],
    notes: [],
    reminders: [],
    benchmarks: [],
  };
  const ev = (e: Omit<ActivityEvent, "id">) => state.events.push({ ...e, id: `e${state.events.length}-${e.ts}` });

  for (const spec of CLINICS) {
    const { kickoffDaysAgo, goLiveInDays, ...rest } = spec.clinic;
    const clinic: Clinic = {
      ...rest,
      kickoffDate: now - kickoffDaysAgo * DAY,
      goLiveDate: now + goLiveInDays * DAY,
    };
    state.clinics.push(clinic);
    const domain = clinic.id + ".vet";

    spec.staff.forEach((ss, idx) => {
      const id = `${clinic.id}-${slug(ss.name)}`;
      const lastActiveAt = ss.lastActiveDays !== undefined ? now - ss.lastActiveDays * DAY : undefined;
      const staff: Staff = {
        id,
        clinicId: clinic.id,
        name: ss.name,
        role: ss.role,
        email: `${slug(ss.name)}@${domain}`,
        invitedAt: clinic.kickoffDate + (idx % 3) * 3_600_000,
        lastActiveAt,
        extraModules: [],
      };
      state.staff.push(staff);
      ev({ ts: staff.invitedAt, clinicId: clinic.id, staffId: id, type: "staff_added", text: `${ss.name} invited to Lupa Academy` });

      const path = ROLE_PATHS[ss.role];
      const activeEnd = lastActiveAt ?? clinic.kickoffDate + DAY;
      const start = clinic.kickoffDate + DAY * (0.5 + r());
      const planned: { moduleId: string; fail: boolean }[] = [];
      for (let i = 0; i < Math.min(ss.done, path.length); i++) {
        const mid = path[i];
        for (let k = 0; k < (ss.retries?.[mid] ?? 0); k++) planned.push({ moduleId: mid, fail: true });
        planned.push({ moduleId: mid, fail: false });
      }
      if (ss.stuckFails && ss.done < path.length) {
        for (let k = 0; k < ss.stuckFails; k++) planned.push({ moduleId: path[ss.done], fail: true });
      }
      planned.forEach((p, i) => {
        const t = start + ((activeEnd - start) * (i + 1)) / planned.length;
        const a = synthAttempt(r, id, p.moduleId, ss.skill, Math.min(t, now - 60_000), p.fail);
        state.attempts.push(a);
        const title = MODULE_MAP[p.moduleId].title;
        ev({
          ts: a.finishedAt,
          clinicId: clinic.id,
          staffId: id,
          moduleId: p.moduleId,
          type: a.passed ? "passed" : "failed",
          text: a.passed
            ? `${ss.name} passed “${title}” with ${a.score}%`
            : `${ss.name} did not pass “${title}” (${a.score}%). Retake required`,
        });
      });
      if (ss.inProgress && ss.done < path.length) {
        state.progress.push({
          staffId: id,
          moduleId: path[ss.done],
          stage: "quiz",
          startedAt: now - 0.1 * DAY,
          updatedAt: lastActiveAt ?? now,
        });
        ev({
          ts: lastActiveAt ?? now,
          clinicId: clinic.id,
          staffId: id,
          moduleId: path[ss.done],
          type: "started",
          text: `${ss.name} started “${MODULE_MAP[path[ss.done]].title}”`,
        });
      }
    });

    state.benchmarks.push(...defaultBenchmarks(clinic));
  }

  /* CRM touchpoints */
  const note = (n: Omit<Note, "id">) => state.notes.push({ ...n, id: `n${state.notes.length}` });
  const riv = state.clinics[0];
  note({ clinicId: "riverside", ts: riv.kickoffDate, author: SPECIALIST, kind: "call", text: "Kickoff call with Diane (PM). Confirmed go-live date and Cornerstone data migration window. 11 staff to train; Dr. Okoro is part-time (Tue/Thu)." });
  note({ clinicId: "riverside", ts: riv.kickoffDate + 2 * DAY, author: SPECIALIST, kind: "training", text: "Remote front desk session (45 min) covering booking + check-in. Olivia and Marcus attended; Jess was off sick. Needs catch-up." });
  note({ clinicId: "riverside", staffId: "riverside-raj.patel", ts: now - 1 * DAY, author: SPECIALIST, kind: "note", text: "Dr. Patel failed the AI Scribe sim twice: signing before correcting the Plan dose both times. Offer a 1:1 walkthrough before retake." });
  note({ clinicId: "riverside", ts: now - 2 * DAY, author: SPECIALIST, kind: "email", text: "Sent weekly readiness report to Diane. Flagged Tom (inactive) and Dr. Okoro (not started)." });
  note({ clinicId: "oakpaw", ts: state.clinics[1].kickoffDate, author: SPECIALIST, kind: "call", text: "Kickoff with Luis. Two sites; ezyVet export scheduled. Want multi-site rota training for managers." });
  note({ clinicId: "coastal", ts: now - 1 * DAY, author: SPECIALIST, kind: "training", text: "Go-live rehearsal: full day-in-the-life dry run. All good except Dr. Ross on discharge. Retake scheduled." });
  note({ clinicId: "harbor", ts: now - 20 * DAY, author: SPECIALIST, kind: "call", text: "Go-live day hypercare call. No blockers. Moving to 30-day check-in cadence." });

  const rem = (x: Omit<Reminder, "id">) => state.reminders.push({ ...x, id: `r${state.reminders.length}` });
  rem({ clinicId: "riverside", staffId: "riverside-tom.becker", ts: now - 3 * DAY, from: SPECIALIST, message: "Hi Tom! You're 1/5 through your Lupa training. Next up is Tasks & Treatment Board (~7 min). Go-live is close!", moduleId: "tasks" });
  rem({ clinicId: "riverside", staffId: "riverside-raj.patel", ts: now - 0.8 * DAY, from: SPECIALIST, message: "Hi Dr. Patel, the AI Scribe retake is ready. Tip: always review the Plan section before signing. Happy to do a 10-min 1:1.", moduleId: "scribe", readAt: now - 0.5 * DAY });
  for (const r0 of state.reminders)
    ev({ ts: r0.ts, clinicId: r0.clinicId, staffId: r0.staffId, type: "reminder", text: `Reminder sent to ${state.staff.find((s) => s.id === r0.staffId)!.name}` });

  state.events.sort((a, b) => b.ts - a.ts);
  return state;
}

export function defaultBenchmarks(clinic: Clinic): Benchmark[] {
  const b = (x: Omit<Benchmark, "id" | "clinicId">, i: number): Benchmark => ({ ...x, id: `${clinic.id}-b${i}`, clinicId: clinic.id });
  const k = clinic.kickoffDate;
  const g = clinic.goLiveDate;
  return [
    b({ label: "Every staff member has started training", kind: "started", target: 100, dueDate: k + 7 * DAY }, 0),
    b({ label: "Front desk certified on Booking & Check-in", kind: "module_cert", moduleId: "booking", role: "frontdesk", target: 100, dueDate: g - 7 * DAY }, 1),
    b({ label: "All vets certified on AI Scribe → SOAP", kind: "module_cert", moduleId: "scribe", role: "vet", target: 100, dueDate: g - 5 * DAY }, 2),
    b({ label: "Checkout with Lupa Pay: front desk certified", kind: "module_cert", moduleId: "checkout", role: "frontdesk", target: 100, dueDate: g - 3 * DAY }, 3),
    b({ label: "Every tech fully certified", kind: "role_cert", role: "tech", target: 100, dueDate: g - 3 * DAY }, 4),
    b({ label: "Clinic readiness ≥ 90% (go-live gate)", kind: "readiness", target: 90, dueDate: g - 2 * DAY }, 5),
  ];
}
