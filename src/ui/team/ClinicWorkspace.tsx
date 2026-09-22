import { useEffect, useMemo, useState } from "react";
import { MODULE_MAP, MODULES } from "../../content/modules";
import {
  DAY,
  elementLabel,
  expectedPace,
  fmtDate,
  isCertified,
  missedSteps,
  PROFICIENCY_LABEL,
  quizMisses,
  relTime,
  STATUS_LABEL,
  summarizeClinic,
  type ClinicSummary,
  type StaffStatus,
} from "../../logic/metrics";
import { Link, useNav } from "../../router";
import { actions, KIND_LABEL, useAppState } from "../../store";
import { ROLE_LABELS, ROLE_SHORT, ROLES, type AppState, type Role } from "../../types";
import { Icon } from "../icons";
import { Avatar, BenchPill, Empty, Meter, Modal, Ring, StatusPill, toast, useTick } from "../primitives";
import { Feed, NoteModal, ReminderModal } from "./shared";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "staff", label: "Staff" },
  { key: "matrix", label: "Skill matrix" },
  { key: "benchmarks", label: "Benchmarks" },
  { key: "insights", label: "Insights" },
  { key: "touchpoints", label: "Touchpoints" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function ClinicWorkspace({ clinicId, tab = "overview" }: { clinicId: string; tab?: string }) {
  const state = useAppState();
  useTick(10_000);
  const [remind, setRemind] = useState<string[] | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [simOn, setSimOn] = useState(false);
  const clinic = state.clinics.find((c) => c.id === clinicId);
  const sum = useMemo(() => (clinic ? summarizeClinic(state, clinicId) : null), [state, clinicId, clinic]);

  useEffect(() => {
    if (!simOn) return;
    actions.simulateTick(clinicId);
    const id = setInterval(() => actions.simulateTick(clinicId), 2600);
    return () => clearInterval(id);
  }, [simOn, clinicId]);

  if (!clinic || !sum) return <div className="page">Clinic not found.</div>;
  const t = (TABS.find((x) => x.key === tab)?.key ?? "overview") as Tab;

  return (
    <div className="page">
      <header className="clinic-head">
        <div>
          <span className="eyebrow">
            {clinic.city} · {clinic.legacyPims} → Lupa · {clinic.contactName} ({clinic.contactRole})
          </span>
          <h1>{clinic.name}</h1>
          <div className="clinic-meta">
            <span className={`stage stage-${clinic.stage.replace(/\s/g, "").toLowerCase()}`}>{clinic.stage}</span>
            <span>
              <Icon name="calendar" size={15} /> Go-live {fmtDate(clinic.goLiveDate)} ·{" "}
              <strong>{sum.daysToGoLive > 0 ? `${sum.daysToGoLive} days to go` : sum.daysToGoLive === 0 ? "today" : `live ${-sum.daysToGoLive} days`}</strong>
            </span>
            <span>
              <Icon name="users" size={15} /> {sum.staff.length} staff · {sum.certifiedStaff} go-live ready
            </span>
          </div>
        </div>
        <div className="clinic-actions">
          <button className="btn btn-primary" onClick={() => setRemind(sum.staff.filter((s) => s.status !== "certified").map((s) => s.staff.id))}>
            <Icon name="send" size={15} /> Remind all not ready
          </button>
          <button className="btn btn-quiet" onClick={() => setNoteOpen(true)}>
            <Icon name="note" size={15} /> Log touchpoint
          </button>
          <button className="btn btn-quiet btn-icon" onClick={() => setAddOpen(true)} title="Invite staff" aria-label="Invite staff">
            <Icon name="plus" size={16} />
          </button>
          <button className="btn btn-quiet btn-icon" onClick={() => exportCsv(sum)} title="Export readiness CSV" aria-label="Export readiness CSV">
            <Icon name="download" size={16} />
          </button>
          <button
            className={`btn btn-icon ${simOn ? "btn-live" : "btn-quiet"}`}
            onClick={() => setSimOn(!simOn)}
            title={simOn ? "Stop simulated activity" : "Simulate clinic activity (demo)"}
            aria-label="Simulate clinic activity"
          >
            <Icon name="bolt" size={16} />
          </button>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map((x) => (
          <Link key={x.key} to={`/team/clinic/${clinicId}${x.key === "overview" ? "" : "/" + x.key}`} className={t === x.key ? "is-on" : ""}>
            {x.label}
            {x.key === "staff" && sum.atRisk > 0 && <b className="tab-badge">{sum.atRisk}</b>}
            {x.key === "benchmarks" && <span className="fine"> {sum.benchmarks.filter((b) => b.state === "met").length}/{sum.benchmarks.length}</span>}
          </Link>
        ))}
      </nav>

      <div className="tab-body" key={t}>
      {t === "overview" && <Overview sum={sum} state={state} onRemind={setRemind} />}
      {t === "staff" && <StaffTable sum={sum} onRemind={setRemind} />}
      {t === "matrix" && <SkillMatrix sum={sum} />}
      {t === "benchmarks" && <Benchmarks sum={sum} />}
      {t === "insights" && <Insights state={state} sum={sum} />}
      {t === "touchpoints" && <Touchpoints state={state} clinicId={clinicId} onLog={() => setNoteOpen(true)} />}
      </div>

      {remind && remind.length > 0 && <ReminderModal staffIds={remind} onClose={() => setRemind(null)} />}
      {noteOpen && <NoteModal clinicId={clinicId} onClose={() => setNoteOpen(false)} />}
      {addOpen && <AddStaffModal clinicId={clinicId} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Overview({ sum, state, onRemind }: { sum: ClinicSummary; state: AppState; onRemind: (ids: string[]) => void }) {
  const ids = new Set(sum.staff.map((s) => s.staff.id));
  const live = state.progress.filter((p) => ids.has(p.staffId)).sort((a, b) => b.updatedAt - a.updatedAt);
  const events = state.events.filter((e) => e.clinicId === sum.clinic.id && e.type !== "stage");
  const pace = Math.round(expectedPace(sum.clinic, Date.now()) * 100);
  return (
    <div className="overview">
      <section className="panel readiness-panel">
        <div className="readiness-top">
          <Ring value={sum.readiness} size={132} label="clinic ready" />
          <div className="role-bars">
            {sum.byRole.map((r) => (
              <div key={r.role} className="role-bar">
                <span>
                  {ROLE_LABELS[r.role]} <span className="fine">· {r.count}</span>
                </span>
                <Meter value={r.readiness} marker={sum.clinic.stage === "Live" ? undefined : pace} />
                <span className="num">{r.readiness}%</span>
              </div>
            ))}
            <p className="fine">│ = expected today ({pace}%)</p>
          </div>
        </div>
        <TrendChart state={state} sum={sum} />
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Training right now</h2>
          <span className="live">
            <span className="live-dot" /> live
          </span>
        </div>
        {live.length === 0 && <Empty>No one is training right now.</Empty>}
        <ul className="now-list">
          {live.slice(0, 6).map((p) => {
            const s = state.staff.find((x) => x.id === p.staffId)!;
            const m = MODULE_MAP[p.moduleId];
            const hot = Date.now() - p.updatedAt < 120_000;
            return (
              <li key={p.staffId + p.moduleId} className={hot ? "is-hot" : ""}>
                <Avatar name={s.name} size={30} />
                <div>
                  <Link to={`/team/clinic/${sum.clinic.id}/staff/${s.id}`} className="strong-link">
                    {s.name}
                  </Link>
                  <div className="fine">
                    {m.title} ·{" "}
                    {p.stage === "sim"
                      ? `simulation step ${Math.min((p.simStep ?? 0) + 1, m.sim.steps.length)}/${m.sim.steps.length}${p.simErrors ? ` · ${p.simErrors} wrong move${p.simErrors > 1 ? "s" : ""}` : ""}`
                      : { compare: "old vs. Lupa workflow", lesson: "lesson", quiz: "knowledge check", result: "results", sim: "" }[p.stage]}
                  </div>
                </div>
                <time className="fine">{hot ? "now" : relTime(p.updatedAt)}</time>
              </li>
            );
          })}
        </ul>
        <div className="section-head" style={{ marginTop: 18 }}>
          <h2>Benchmarks</h2>
          <Link to={`/team/clinic/${sum.clinic.id}/benchmarks`} className="fine strong-link">
            All benchmarks →
          </Link>
        </div>
        <ul className="bench-mini">
          {sum.benchmarks.map((b) => (
            <li key={b.benchmark.id}>
              <BenchPill state={b.state} />
              <span>{b.benchmark.label}</span>
              <span className="num fine">
                {b.value}/{b.benchmark.target}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Who needs you</h2>
        </div>
        <ul className="attention">
          {sum.staff
            .filter((s) => s.status === "at_risk" || s.status === "behind")
            .sort((a, b) => (a.status === "at_risk" ? -1 : 1) - (b.status === "at_risk" ? -1 : 1))
            .map((s) => {
              const stuck = s.modules.find((m) => m.proficiency === "retrain");
              return (
                <li key={s.staff.id}>
                  <Avatar name={s.staff.name} size={30} />
                  <div>
                    <Link to={`/team/clinic/${sum.clinic.id}/staff/${s.staff.id}`} className="strong-link">
                      {s.staff.name}
                    </Link>
                    <span className="fine"> · {ROLE_SHORT[s.staff.role]}</span>
                    <div className="fine">
                      {stuck
                        ? `Stuck on “${MODULE_MAP[stuck.moduleId].title}” (${stuck.failedAttempts} failed)`
                        : `${s.certified}/${s.total} modules · last active ${relTime(s.staff.lastActiveAt)}`}
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                  <button className="btn btn-sm btn-quiet" onClick={() => onRemind([s.staff.id])}>
                    <Icon name="send" size={14} /> Remind
                  </button>
                </li>
              );
            })}
          {!sum.staff.some((s) => s.status === "at_risk" || s.status === "behind") && <li className="fine">Everyone is on pace.</li>}
        </ul>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Activity</h2>
        </div>
        <Feed events={events} limit={12} />
      </section>
    </div>
  );
}

function TrendChart({ state, sum }: { state: AppState; sum: ClinicSummary }) {
  const W = 640;
  const H = 200;
  const P = { l: 36, r: 16, t: 14, b: 28 };
  const start = sum.clinic.kickoffDate;
  const end = Math.max(sum.clinic.goLiveDate, Date.now());
  const now = Date.now();
  const x = (ts: number) => P.l + ((ts - start) / (end - start)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v / 100) * (H - P.t - P.b);

  const ids = new Set(sum.staff.map((s) => s.staff.id));
  const passes = state.attempts.filter((a) => ids.has(a.staffId) && a.passed && !a.superseded);
  const totalMods = sum.staff.reduce((a, s) => a + s.total, 0) || 1;
  const pts: [number, number][] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const ts = start + ((Math.min(now, end) - start) * i) / steps;
    const certified = new Set(passes.filter((a) => a.finishedAt <= ts).map((a) => a.staffId + a.moduleId)).size;
    pts.push([ts, Math.round((certified / totalMods) * 100)]);
  }
  const line = pts.map(([t, v], i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts[pts.length - 1][0]).toFixed(1)},${y(0)} L${x(start)},${y(0)} Z`;
  const targetEnd = sum.clinic.goLiveDate - 3 * DAY;
  const last = pts[pts.length - 1];

  return (
    <figure className="trend">
      <figcaption>
        <span className="eyebrow">Readiness since kickoff</span>
        <span className="legend">
          <i className="lg-actual" /> Actual <i className="lg-target" /> Target pace
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Readiness ${last[1]}% versus target`}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={P.l - 8} y={y(v) + 4} className="axis" textAnchor="end">
              {v}%
            </text>
          </g>
        ))}
        <line x1={x(start)} y1={y(0)} x2={x(targetEnd)} y2={y(100)} className="target" />
        <line x1={x(sum.clinic.goLiveDate)} x2={x(sum.clinic.goLiveDate)} y1={P.t} y2={y(0)} className="golive" />
        <text x={x(sum.clinic.goLiveDate) - 4} y={P.t + 10} className="axis" textAnchor="end">
          Go-live
        </text>
        <path d={area} className="area" />
        <path d={line} className="actual" />
        <circle cx={x(last[0])} cy={y(last[1])} r="4.5" className="endpoint" />
        <text x={x(start)} y={H - 8} className="axis">
          Kickoff {fmtDate(start)}
        </text>
        <text x={Math.min(x(now), W - P.r - 60)} y={H - 8} className="axis">
          Today
        </text>
      </svg>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

function StaffTable({ sum, onRemind }: { sum: ClinicSummary; onRemind: (ids: string[]) => void }) {
  const [role, setRole] = useState<Role | "all">("all");
  const [status, setStatus] = useState<StaffStatus | "all">("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const pace = Math.round(expectedPace(sum.clinic, Date.now()) * 100);
  const rows = sum.staff
    .filter((s) => (role === "all" || s.staff.role === role) && (status === "all" || s.status === status) && s.staff.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.readiness - b.readiness);
  const toggle = (id: string) => {
    const n = new Set(sel);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSel(n);
  };
  return (
    <section className="panel">
      <div className="filters">
        <label className="field inline">
          <Icon name="search" size={15} />
          <input id="staff-search" placeholder="Search staff" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select id="staff-role" value={role} onChange={(e) => setRole(e.target.value as Role | "all")}>
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select id="staff-status" value={status} onChange={(e) => setStatus(e.target.value as StaffStatus | "all")}>
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABEL) as StaffStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <button className="btn btn-sm btn-primary" disabled={!sel.size} onClick={() => onRemind([...sel])}>
          <Icon name="send" size={14} /> Remind {sel.size || ""} selected
        </button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={rows.length > 0 && rows.every((r) => sel.has(r.staff.id))}
                  onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.staff.id)) : new Set())}
                />
              </th>
              <th>Staff member</th>
              <th>Status</th>
              <th style={{ width: "18%" }}>Readiness</th>
              <th>Certified</th>
              <th title="Modules past their due date">Overdue</th>
              <th>Avg score</th>
              <th title="Share of modules passed on the first attempt">First-try</th>
              <th>Time spent</th>
              <th>Last active</th>
              <th>Next up</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.staff.id}>
                <td>
                  <input type="checkbox" aria-label={`Select ${s.staff.name}`} checked={sel.has(s.staff.id)} onChange={() => toggle(s.staff.id)} />
                </td>
                <td>
                  <span className="person">
                    <Avatar name={s.staff.name} size={30} />
                    <span>
                      <Link to={`/team/clinic/${sum.clinic.id}/staff/${s.staff.id}`} className="strong-link">
                        {s.staff.name}
                      </Link>
                      <span className="fine block">{ROLE_LABELS[s.staff.role]}</span>
                    </span>
                  </span>
                </td>
                <td>
                  <StatusPill status={s.status} />
                </td>
                <td>
                  <div className="meter-row">
                    <Meter value={s.readiness} marker={sum.clinic.stage === "Live" ? undefined : pace} />
                    <span className="num">{s.readiness}%</span>
                  </div>
                </td>
                <td className="num">
                  {s.certified}/{s.total}
                </td>
                <td className="num">{s.overdue ? <span className="pill pill-crit">{s.overdue}</span> : <span className="fine">–</span>}</td>
                <td className="num">{s.avgScore ?? "–"}</td>
                <td className="num">{s.firstTryRate !== null ? `${s.firstTryRate}%` : "–"}</td>
                <td className="num">{s.totalMinutes ? `${s.totalMinutes}m` : "–"}</td>
                <td className="fine">{relTime(s.staff.lastActiveAt)}</td>
                <td className="fine">{s.nextModule ? MODULE_MAP[s.nextModule].title : "Done"}</td>
                <td>
                  {s.status !== "certified" && (
                    <button className="btn btn-sm btn-quiet" onClick={() => onRemind([s.staff.id])}>
                      Remind
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <Empty>No staff match these filters.</Empty>}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function SkillMatrix({ sum }: { sum: ClinicSummary }) {
  const { go } = useNav();
  const used = MODULES.filter((m) => sum.staff.some((s) => s.modules.some((x) => x.moduleId === m.id)));
  return (
    <section className="panel">
      <div className="section-head">
        <h2>Who knows what</h2>
        <span className="legend">
          <i className="cell cell-mastered" /> Mastered <i className="cell cell-proficient" /> Certified <i className="cell cell-retrain" /> Needs retraining{" "}
          <i className="cell cell-in_progress" /> In progress <i className="cell cell-not_started" /> Not started <i className="cell cell-na" /> Not assigned
        </span>
      </div>
      <div className="table-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th />
              {used.map((m) => (
                <th key={m.id} title={m.title}>
                  <span>{m.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((role) => {
              const group = sum.staff.filter((s) => s.staff.role === role);
              if (!group.length) return null;
              return [
                <tr key={role} className="matrix-group">
                  <th colSpan={used.length + 1}>{ROLE_LABELS[role]}</th>
                </tr>,
                ...group.map((s) => (
                  <tr key={s.staff.id} onClick={() => go(`/team/clinic/${sum.clinic.id}/staff/${s.staff.id}`)}>
                    <th className="matrix-name">{s.staff.name}</th>
                    {used.map((m) => {
                      const ms = s.modules.find((x) => x.moduleId === m.id);
                      if (!ms)
                        return (
                          <td key={m.id}>
                            <span className="cell cell-na" />
                          </td>
                        );
                      return (
                        <td key={m.id}>
                          <span
                            className={`cell cell-${ms.proficiency}`}
                            title={`${s.staff.name} · ${m.title}: ${PROFICIENCY_LABEL[ms.proficiency]}${ms.best ? ` · best ${ms.best.score}%` : ""}${ms.attempts ? ` · ${ms.attempts} attempt(s)` : ""}`}
                          >
                            {ms.best && isCertified(ms) ? ms.best.score : ms.proficiency === "retrain" ? `${ms.failedAttempts}✕` : ""}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Benchmarks({ sum }: { sum: ClinicSummary }) {
  return (
    <section className="panel">
      <div className="section-head">
        <h2>Go-live benchmarks</h2>
        <span className="fine">Evaluated live from each learner's certified modules</span>
      </div>
      <ul className="bench-list">
        {sum.benchmarks.map((b) => (
          <li key={b.benchmark.id} className={`bench bench-${b.state}`}>
            <div className="bench-main">
              <strong>{b.benchmark.label}</strong>
              <span className="fine">
                {b.detail} · due {fmtDate(b.benchmark.dueDate)}
              </span>
            </div>
            <div className="bench-meter">
              <Meter value={b.value} tone={b.state === "met" ? "good" : b.state === "overdue" ? "crit" : b.state === "at_risk" ? "warn" : "info"} marker={b.benchmark.target} />
              <span className="num">
                {b.value}% <span className="fine">/ {b.benchmark.target}%</span>
              </span>
            </div>
            <label className="bench-target fine">
              Target
              <select id={`target-${b.benchmark.id}`} value={b.benchmark.target} onChange={(e) => actions.setBenchmarkTarget(b.benchmark.id, Number(e.target.value))}>
                {[70, 80, 90, 100].map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </label>
            <BenchPill state={b.state} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Insights({ state, sum }: { state: AppState; sum: ClinicSummary }) {
  const steps = missedSteps(state, sum.clinic.id).slice(0, 8);
  const quiz = quizMisses(state, sum.clinic.id).slice(0, 5);
  const ids = new Set(sum.staff.map((s) => s.staff.id));
  const perModule = MODULES.map((m) => {
    const at = state.attempts.filter((a) => a.moduleId === m.id && ids.has(a.staffId));
    const people = new Set(at.map((a) => a.staffId));
    const firstTry = [...people].filter((p) => at.filter((a) => a.staffId === p).sort((a, b) => a.finishedAt - b.finishedAt)[0].passed).length;
    return {
      m,
      attempts: at.length,
      people: people.size,
      avg: at.length ? Math.round(at.reduce((a, b) => a + b.score, 0) / at.length) : null,
      firstTry: people.size ? Math.round((firstTry / people.size) * 100) : null,
      avgErrors: at.length ? (at.reduce((a, b) => a + b.errors, 0) / at.length).toFixed(1) : null,
    };
  }).filter((x) => x.attempts > 0);
  const maxCount = Math.max(1, ...steps.map((s) => s.count));

  return (
    <div className="grid-2">
      <section className="panel">
        <div className="section-head">
          <h2>Where workflows break down</h2>
        </div>
        <p className="fine">Most-missed simulation steps. Build your next session around these.</p>
        {!steps.length && <Empty>No workflow mistakes recorded yet.</Empty>}
        <ol className="missed">
          {steps.map((s) => {
            const m = MODULE_MAP[s.moduleId];
            const step = m.sim.steps.find((x) => x.id === s.stepId);
            return (
              <li key={s.moduleId + s.stepId}>
                <div className="missed-top">
                  <strong>{step?.instruction ?? s.stepId}</strong>
                  <span className="num">{s.count}×</span>
                </div>
                <span className="missed-bar" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                <span className="fine">
                  {m.title} · {s.people} {s.people === 1 ? "person" : "people"}
                  {s.topWrong ? ` · most common wrong move: ${elementLabel(s.moduleId, s.topWrong)}` : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Module difficulty</h2>
        </div>
        <div className="table-wrap">
          <table className="table compact">
            <thead>
              <tr>
                <th>Module</th>
                <th>Learners</th>
                <th>Avg score</th>
                <th>First-try pass</th>
                <th>Avg wrong moves</th>
              </tr>
            </thead>
            <tbody>
              {perModule.map((x) => (
                <tr key={x.m.id}>
                  <td>{x.m.title}</td>
                  <td className="num">{x.people}</td>
                  <td className="num">{x.avg}%</td>
                  <td className="num">
                    <span className={x.firstTry !== null && x.firstTry < 70 ? "text-crit" : ""}>{x.firstTry}%</span>
                  </td>
                  <td className="num">{x.avgErrors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="section-head" style={{ marginTop: 20 }}>
          <h2>Common misconceptions</h2>
        </div>
        {!quiz.length && <Empty>No knowledge-check misses yet.</Empty>}
        <ul className="misconceptions">
          {quiz.map((q) => {
            const qq = MODULE_MAP[q.moduleId].quiz.find((x) => x.id === q.questionId);
            return (
              <li key={q.moduleId + q.questionId}>
                <span className="num pill pill-warn">{q.count}×</span>
                <div>
                  <strong>{qq?.prompt}</strong>
                  <span className="fine block">Correct: {qq ? qq.options[qq.correct] : ""}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Touchpoints({ state, clinicId, onLog }: { state: AppState; clinicId: string; onLog: () => void }) {
  const notes = state.notes.filter((n) => n.clinicId === clinicId).sort((a, b) => b.ts - a.ts);
  const reminders = state.reminders.filter((r) => r.clinicId === clinicId).sort((a, b) => b.ts - a.ts);
  const name = (id?: string) => state.staff.find((s) => s.id === id)?.name;
  return (
    <div className="grid-2">
      <section className="panel">
        <div className="section-head">
          <h2>Touchpoint log</h2>
          <button className="btn btn-sm btn-primary" onClick={onLog}>
            <Icon name="plus" size={14} /> Log touchpoint
          </button>
        </div>
        <ol className="notes">
          {notes.map((n) => (
            <li key={n.id}>
              <span className={`note-kind kind-${n.kind}`}>{KIND_LABEL[n.kind]}</span>
              <p>{n.text}</p>
              <span className="fine">
                {n.author} · {fmtDate(n.ts)} · {relTime(n.ts)}
                {n.staffId ? ` · re ${name(n.staffId)}` : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Reminders sent</h2>
        </div>
        {!reminders.length && <Empty>No reminders sent yet.</Empty>}
        <ul className="reminders">
          {reminders.map((r) => (
            <li key={r.id}>
              <div className="reminder-top">
                <strong>{name(r.staffId)}</strong>
                {r.readAt ? <span className="pill pill-good">Read {relTime(r.readAt)}</span> : <span className="pill pill-mute">Unread</span>}
              </div>
              <p>{r.message}</p>
              <span className="fine">Sent {relTime(r.ts)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AddStaffModal({ clinicId, onClose }: { clinicId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("frontdesk");
  const [email, setEmail] = useState("");
  return (
    <Modal title="Invite a staff member" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          actions.addStaff(clinicId, name.trim(), role, email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, ".")}@${clinicId}.vet`);
          toast(`${name.trim()} invited: their ${ROLE_LABELS[role]} path is assigned`, "good");
          onClose();
        }}
      >
        <label className="field">
          <span>Full name</span>
          <input id="new-staff-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. Maya Collins" autoFocus />
        </label>
        <label className="field">
          <span>Role</span>
          <select id="new-staff-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Email</span>
          <input id="new-staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@clinic.com" />
        </label>
        <p className="fine">They'll get a magic-link invite and the learning path for their role. You can add extra modules from their profile.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!name.trim()}>
            Send invite
          </button>
        </div>
      </form>
    </Modal>
  );
}

function exportCsv(sum: ClinicSummary) {
  const mods = MODULES.filter((m) => sum.staff.some((s) => s.modules.some((x) => x.moduleId === m.id)));
  const header = ["Name", "Role", "Email", "Status", "Readiness %", "Certified", "Avg score", "First-try %", "Minutes", "Last active", ...mods.map((m) => m.title)];
  const rows = sum.staff.map((s) => [
    s.staff.name,
    ROLE_LABELS[s.staff.role],
    s.staff.email,
    STATUS_LABEL[s.status],
    s.readiness,
    `${s.certified}/${s.total}`,
    s.avgScore ?? "",
    s.firstTryRate ?? "",
    s.totalMinutes,
    s.staff.lastActiveAt ? new Date(s.staff.lastActiveAt).toISOString() : "",
    ...mods.map((m) => {
      const ms = s.modules.find((x) => x.moduleId === m.id);
      if (!ms) return "n/a";
      return `${PROFICIENCY_LABEL[ms.proficiency]}${ms.best ? ` (${ms.best.score}%)` : ""}`;
    }),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${sum.clinic.id}-readiness-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
