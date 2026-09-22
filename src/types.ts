export type Role = "vet" | "tech" | "frontdesk" | "manager";

export const ROLES: Role[] = ["vet", "tech", "frontdesk", "manager"];

export const ROLE_LABELS: Record<Role, string> = {
  vet: "Veterinarian",
  tech: "Vet Tech / Nurse",
  frontdesk: "Front Desk",
  manager: "Practice Manager",
};

export const ROLE_SHORT: Record<Role, string> = {
  vet: "DVM",
  tech: "Tech",
  frontdesk: "Front desk",
  manager: "Manager",
};

/* ---------- Training content ---------- */

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  explain: string;
}

/** Sidebar destinations of the simulated Lupa app. */
export type NavKey =
  | "home"
  | "calendar"
  | "patients"
  | "consult"
  | "messages"
  | "billing"
  | "tasks"
  | "inventory"
  | "rota"
  | "reports"
  | "insurance";

interface ItemBase {
  /** Only render once this step has been completed. */
  showAfter?: string;
  /** Stop rendering once this step has been completed. */
  hideAfter?: string;
}

export type SimItem = ItemBase &
  (
    | { kind: "button"; id: string; label: string; variant?: "primary" | "ghost" | "danger" }
    | { kind: "select"; id: string; label: string; options: string[] }
    | { kind: "input"; id: string; label: string; placeholder?: string }
    | { kind: "row"; id: string; cells: string[]; badge?: string }
    | { kind: "text"; text: string; tone?: "muted" | "ai" | "warn" | "success" | "strong" }
    | { kind: "kv"; pairs: [string, string][] }
  );

export interface SimSection {
  title?: string;
  /** Visual treatment of the section. */
  layout?: "stack" | "row" | "table";
  columns?: string[];
  span?: "full" | "half";
  items: SimItem[];
}

export interface SimScreen {
  id: string;
  nav: NavKey;
  title: string;
  subtitle?: string;
  sections: SimSection[];
}

export interface SimStep {
  id: string;
  instruction: string;
  screen: string;
  /** Element id the learner must use. Sidebar entries are `nav:<key>`. */
  target: string;
  /** For select/input targets: the value that counts as correct (case-insensitive). */
  value?: string;
  hint: string;
  /** Shown after the learner gets this step right. */
  why?: string;
  /** Tailored feedback when a specific wrong element is used. */
  wrong?: Record<string, string>;
}

export interface Simulation {
  scenario: string;
  screens: SimScreen[];
  steps: SimStep[];
}

export interface TrainingModule {
  id: string;
  title: string;
  category: string;
  roles: Role[];
  minutes: number;
  summary: string;
  /** Legacy workflow; `{pims}` is replaced by the clinic's current system. */
  oldWay: string[];
  newWay: string[];
  impact: string;
  lesson: { heading: string; body: string }[];
  quiz: QuizQuestion[];
  sim: Simulation;
  passScore: number;
}

/* ---------- CRM / progress data ---------- */

export type ClinicStage = "Kickoff" | "Training" | "Go-live ready" | "Live";

export interface Clinic {
  id: string;
  name: string;
  city: string;
  legacyPims: string;
  kickoffDate: number;
  goLiveDate: number;
  specialist: string;
  contactName: string;
  contactRole: string;
  stage: ClinicStage;
}

export interface Staff {
  id: string;
  clinicId: string;
  name: string;
  role: Role;
  email: string;
  invitedAt: number;
  lastActiveAt?: number;
  /** Modules added by the deployment team on top of the role path. */
  extraModules: string[];
}

export interface Attempt {
  id: string;
  staffId: string;
  moduleId: string;
  startedAt: number;
  finishedAt: number;
  quizScore: number;
  simScore: number;
  score: number;
  passed: boolean;
  errors: number;
  hints: number;
  durationSec: number;
  mistakes: { stepId: string; clicked: string }[];
  quizMisses: string[];
  /** Set when the deployment team requires recertification. */
  superseded?: boolean;
}

export type Stage = "compare" | "lesson" | "quiz" | "sim" | "result";

export interface InProgress {
  staffId: string;
  moduleId: string;
  stage: Stage;
  startedAt: number;
  updatedAt: number;
  simStep?: number;
  simErrors?: number;
}

export type EventType =
  | "started"
  | "stage"
  | "quiz"
  | "sim_error"
  | "passed"
  | "failed"
  | "reminder"
  | "reminder_read"
  | "note"
  | "staff_added"
  | "assigned"
  | "recert"
  | "login";

export interface ActivityEvent {
  id: string;
  ts: number;
  clinicId: string;
  staffId?: string;
  moduleId?: string;
  type: EventType;
  text: string;
}

export type NoteKind = "call" | "training" | "email" | "note";

export interface Note {
  id: string;
  clinicId: string;
  staffId?: string;
  ts: number;
  author: string;
  kind: NoteKind;
  text: string;
}

export interface Reminder {
  id: string;
  clinicId: string;
  staffId: string;
  ts: number;
  from: string;
  message: string;
  moduleId?: string;
  readAt?: number;
}

export type BenchmarkKind = "started" | "role_cert" | "module_cert" | "readiness";

export interface Benchmark {
  id: string;
  clinicId: string;
  label: string;
  kind: BenchmarkKind;
  role?: Role;
  moduleId?: string;
  target: number;
  dueDate: number;
}

export interface AppState {
  version: number;
  clinics: Clinic[];
  staff: Staff[];
  attempts: Attempt[];
  progress: InProgress[];
  events: ActivityEvent[];
  notes: Note[];
  reminders: Reminder[];
  benchmarks: Benchmark[];
}
