import { useState } from "react";
import { MODULE_MAP, MODULES } from "../../content/modules";
import { assignedModules, elementLabel, fmtDate, isCertified, relTime, summarizeStaff } from "../../logic/metrics";
import { Link } from "../../router";
import { actions, KIND_LABEL, useAppState } from "../../store";
import { ROLE_LABELS } from "../../types";
import { Icon } from "../icons";
import { Avatar, CountUp, Modal, ProficiencyPill, Ring, StatusPill, toast, useTick } from "../primitives";
import { Feed, NoteModal, ReminderModal } from "./shared";

export function StaffProfile({ clinicId, staffId }: { clinicId: string; staffId: string }) {
  const state = useAppState();
  useTick();
  const [remind, setRemind] = useState(false);
  const [note, setNote] = useState(false);
  const [assign, setAssign] = useState(false);
  const [recert, setRecert] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const staff = state.staff.find((s) => s.id === staffId);
  if (!staff) return <div className="page">Staff member not found.</div>;
  const clinic = state.clinics.find((c) => c.id === clinicId)!;
  const sum = summarizeStaff(state, staff);
  const attempts = state.attempts.filter((a) => a.staffId === staffId).sort((a, b) => b.finishedAt - a.finishedAt);
  const reminders = state.reminders.filter((r) => r.staffId === staffId).sort((a, b) => b.ts - a.ts);
  const notes = state.notes.filter((n) => n.staffId === staffId);
  const events = state.events.filter((e) => e.staffId === staffId && e.type !== "stage");
  const live = state.progress.find((p) => p.staffId === staffId);
  const assignable = MODULES.filter((m) => !assignedModules(staff).includes(m.id));

  return (
    <div className="page">
      <Link to={`/team/clinic/${clinicId}/staff`} className="back-link">
        <Icon name="back" size={16} /> {clinic.name} · Staff
      </Link>
      <header className="profile-head">
        <Avatar name={staff.name} size={64} />
        <div className="profile-id">
          <span className="eyebrow">
            {ROLE_LABELS[staff.role]} · {clinic.name}
          </span>
          <h1>{staff.name}</h1>
          <div className="clinic-meta">
            <StatusPill status={sum.status} />
            <span className="fine">{staff.email}</span>
            <span className="fine">Invited {fmtDate(staff.invitedAt)}</span>
            <span className="fine">Last active {relTime(staff.lastActiveAt)}</span>
          </div>
        </div>
        <Ring value={sum.readiness} size={104} label="ready" />
      </header>

      <div className="clinic-actions">
        <button className="btn btn-primary" onClick={() => setRemind(true)}>
          <Icon name="send" size={15} /> Send reminder
        </button>
        <button className="btn btn-quiet" onClick={() => setAssign(true)} disabled={!assignable.length}>
          <Icon name="target" size={15} /> Assign module
        </button>
        <button className="btn btn-quiet" onClick={() => setNote(true)}>
          <Icon name="note" size={15} /> Log note
        </button>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="eyebrow">Certified</span>
          <strong className="num">
            {sum.certified}/{sum.total}
          </strong>
          <span className="fine">modules</span>
        </div>
        <div className={`kpi ${sum.overdue ? "kpi-alert" : ""}`}>
          <span className="eyebrow">Overdue</span>
          <strong className="num">
            <CountUp value={sum.overdue} />
          </strong>
          <span className="fine">past due date</span>
        </div>
        <div className="kpi">
          <span className="eyebrow">Avg best score</span>
          <strong className="num">{sum.avgScore ?? "–"}</strong>
          <span className="fine">certified modules</span>
        </div>
        <div className="kpi">
          <span className="eyebrow">First-try pass</span>
          <strong className="num">{sum.firstTryRate !== null ? `${sum.firstTryRate}%` : "–"}</strong>
          <span className="fine">thoroughness</span>
        </div>
        <div className="kpi">
          <span className="eyebrow">Time in training</span>
          <strong className="num">{sum.totalMinutes}m</strong>
          <span className="fine">{attempts.length} attempts</span>
        </div>
      </div>

      {live && (
        <div className="live-banner">
          <span className="live-dot" /> Currently in <strong>{MODULE_MAP[live.moduleId].title}</strong> · {live.stage === "sim" ? `simulation step ${(live.simStep ?? 0) + 1}` : live.stage}
          {live.simErrors ? ` · ${live.simErrors} wrong moves so far` : ""} · updated {relTime(live.updatedAt)}
        </div>
      )}

      <section className="panel">
        <div className="section-head">
          <h2>Module record</h2>
          <span className="fine">Click a module to see every attempt and exactly where they went off-workflow</span>
        </div>
        <ul className="module-record">
          {sum.modules.map((m) => {
            const mod = MODULE_MAP[m.moduleId];
            const list = attempts.filter((a) => a.moduleId === m.moduleId);
            const isOpen = open === m.moduleId;
            return (
              <li key={m.moduleId} className={isOpen ? "is-open" : ""}>
                <button className="record-row" onClick={() => setOpen(isOpen ? null : m.moduleId)} aria-expanded={isOpen}>
                  <span className="record-title">
                    <strong>{mod.title}</strong>
                    <span className="fine">
                      {staff.extraModules.includes(m.moduleId) ? "Assigned by Lupa · " : ""}
                      due {fmtDate(m.dueDate)}
                      {!m.unlocked ? " · locked" : ""}
                    </span>
                  </span>
                  <span className="record-pills">
                    {m.overdue && <span className="pill pill-crit">Overdue</span>}
                    <ProficiencyPill p={m.proficiency} recert={m.recert} />
                  </span>
                  <span className="num record-score">{m.best ? `${m.best.score}%` : "–"}</span>
                  <span className="fine record-attempts">
                    {m.attempts} attempt{m.attempts === 1 ? "" : "s"}
                  </span>
                  <Icon name="arrow" size={15} className="record-chevron" />
                </button>
                {isOpen && (
                  <div className="record-detail">
                    {!list.length && <p className="fine">No attempts yet.</p>}
                    {list.map((a) => (
                      <div key={a.id} className="attempt">
                        <div className="attempt-top">
                          <span className={`pill ${a.passed && !a.superseded ? "pill-good" : a.superseded ? "pill-mute" : "pill-crit"}`}>
                            {a.superseded ? "Superseded" : a.passed ? "Passed" : "Did not pass"}
                          </span>
                          <strong className="num">{a.score}%</strong>
                          <span className="fine">
                            quiz {a.quizScore}% · workflow {a.simScore}% · {a.errors} wrong moves · {a.hints} hints · {Math.round(a.durationSec / 60)}m ·{" "}
                            {fmtDate(a.finishedAt)} ({relTime(a.finishedAt)})
                          </span>
                        </div>
                        {a.mistakes.length > 0 && (
                          <ul className="mistakes">
                            {a.mistakes.map((mk, i) => {
                              const step = mod.sim.steps.find((s) => s.id === mk.stepId);
                              return (
                                <li key={i}>
                                  <Icon name="x" size={12} /> At “{step?.instruction}”, they chose <strong>{elementLabel(m.moduleId, mk.clicked)}</strong>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {a.quizMisses.length > 0 && (
                          <p className="fine">Missed questions: {a.quizMisses.map((q) => mod.quiz.find((x) => x.id === q)?.prompt).join(" · ")}</p>
                        )}
                      </div>
                    ))}
                    <div className="record-actions">
                      {isCertified(m) && (
                        <button className="btn btn-sm btn-quiet" onClick={() => setRecert(m.moduleId)}>
                          <Icon name="refresh" size={14} /> Require recertification
                        </button>
                      )}
                      {staff.extraModules.includes(m.moduleId) && m.attempts === 0 && (
                        <button className="btn btn-sm btn-quiet" onClick={() => actions.unassignModule(staff.id, m.moduleId)}>
                          Remove assignment
                        </button>
                      )}
                      <Link to={`/team/library/${m.moduleId}`} className="btn btn-sm btn-quiet">
                        <Icon name="eye" size={14} /> Preview module
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="section-head">
            <h2>Reminders & notes</h2>
          </div>
          {!reminders.length && !notes.length && <p className="fine">No reminders or notes yet.</p>}
          <ul className="reminders">
            {reminders.map((r) => (
              <li key={r.id}>
                <div className="reminder-top">
                  <strong>Reminder</strong>
                  {r.readAt ? <span className="pill pill-good">Read {relTime(r.readAt)}</span> : <span className="pill pill-mute">Unread</span>}
                </div>
                <p>{r.message}</p>
                <span className="fine">Sent {relTime(r.ts)}</span>
              </li>
            ))}
            {notes.map((n) => (
              <li key={n.id}>
                <div className="reminder-top">
                  <strong>{KIND_LABEL[n.kind]}</strong>
                </div>
                <p>{n.text}</p>
                <span className="fine">
                  {n.author} · {relTime(n.ts)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Activity</h2>
          </div>
          <Feed events={events} limit={15} />
        </section>
      </div>

      {remind && <ReminderModal staffIds={[staff.id]} onClose={() => setRemind(false)} />}
      {note && <NoteModal clinicId={clinicId} staffId={staff.id} onClose={() => setNote(false)} />}
      {assign && (
        <Modal title={`Assign a module to ${staff.name}`} onClose={() => setAssign(false)}>
          <p className="fine">Extra modules are added to the end of their path and count toward readiness.</p>
          <ul className="assign-list">
            {assignable.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.title}</strong>
                  <span className="fine block">
                    {m.category} · ~{m.minutes} min · usually for {m.roles.map((r) => ROLE_LABELS[r]).join(", ")}
                  </span>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    actions.assignModule(staff.id, m.id);
                    toast(`“${m.title}” assigned to ${staff.name}`, "good");
                    setAssign(false);
                  }}
                >
                  Assign
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {recert && (
        <Modal title="Require recertification?" onClose={() => setRecert(null)}>
          <p>
            {staff.name} will need to retake <strong>{MODULE_MAP[recert].title}</strong>. Their past attempts stay on record, but no longer count
            toward readiness. Use this after a workflow change or if you see them struggling on the floor.
          </p>
          <div className="form-actions">
            <button className="btn btn-quiet" onClick={() => setRecert(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                actions.requireRecert(staff.id, recert);
                toast("Recertification required", "warn");
                setRecert(null);
              }}
            >
              Require retake
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
