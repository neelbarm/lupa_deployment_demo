import { useMemo, useState } from "react";
import { MODULE_MAP } from "../../content/modules";
import { expectedPace, fmtDate, relTime, summarizeClinic } from "../../logic/metrics";
import { Link } from "../../router";
import { useAppState } from "../../store";
import { isLive, ROLE_SHORT } from "../../types";
import { Icon } from "../icons";
import { Avatar, CountUp, Meter, StatusPill, useTick } from "../primitives";
import { Feed, ReminderModal } from "./shared";

export function Portfolio() {
  const state = useAppState();
  useTick();
  const [remind, setRemind] = useState<string[] | null>(null);
  const clinics = useMemo(() => state.clinics.map((c) => summarizeClinic(state, c.id)), [state]);
  const active = clinics.filter((c) => !isLive(c.clinic.stage));
  const learners = active.flatMap((c) => c.staff);
  const avgReady = active.length ? Math.round(active.reduce((a, c) => a + c.readiness, 0) / active.length) : 0;
  const atRisk = learners.filter((s) => s.status === "at_risk");
  const overdue = active.flatMap((c) => c.benchmarks.filter((b) => b.state === "overdue" || b.state === "at_risk").map((b) => ({ c, b })));
  const certsThisWeek = state.attempts.filter((a) => a.passed && Date.now() - a.finishedAt < 7 * 86_400_000).length;

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <span className="eyebrow">Deployment portfolio</span>
          <h1>Clinic readiness</h1>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi">
          <span className="eyebrow">Active deployments</span>
          <strong className="num">
            <CountUp value={active.length} />
          </strong>
          <span className="fine">{clinics.length - active.length} live, in hypercare</span>
        </div>
        <div className="kpi">
          <span className="eyebrow">Staff in training</span>
          <strong className="num">
            <CountUp value={learners.length} />
          </strong>
          <span className="fine">{learners.filter((s) => s.status === "certified").length} fully certified</span>
        </div>
        <div className="kpi">
          <span className="eyebrow">Avg. readiness</span>
          <strong className="num">
            <CountUp value={avgReady} suffix="%" />
          </strong>
          <span className="fine">across active clinics</span>
        </div>
        <div className="kpi">
          <span className="eyebrow">Certifications · 7 days</span>
          <strong className="num">
            <CountUp value={certsThisWeek} />
          </strong>
          <span className="fine">modules passed</span>
        </div>
        <div className={`kpi ${atRisk.length ? "kpi-alert" : ""}`}>
          <span className="eyebrow">Staff at risk</span>
          <strong className="num">
            <CountUp value={atRisk.length} />
          </strong>
          <span className="fine">need a nudge or a 1:1</span>
        </div>
      </div>

      <section className="panel">
        <div className="section-head">
          <h2>Deployments</h2>
          <span className="fine">│ = expected today</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Stage</th>
                <th>Migrating from</th>
                <th>Go-live</th>
                <th style={{ width: "22%" }}>Readiness</th>
                <th>At risk</th>
                <th>Benchmarks</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => {
                const pace = Math.round(expectedPace(c.clinic, Date.now()) * 100);
                const met = c.benchmarks.filter((b) => b.state === "met").length;
                return (
                  <tr key={c.clinic.id}>
                    <td>
                      <Link to={`/team/clinic/${c.clinic.id}`} className="strong-link">
                        {c.clinic.name}
                      </Link>
                      <div className="fine">
                        {c.clinic.city} · {c.staff.length} staff
                      </div>
                    </td>
                    <td>
                      <span className={`stage stage-${c.clinic.stage.replace(/\s/g, "").toLowerCase()}`}>{c.clinic.stage}</span>
                    </td>
                    <td>{c.clinic.legacyPims}</td>
                    <td className="num">
                      {fmtDate(c.clinic.goLiveDate)}
                      <div className="fine">{c.daysToGoLive > 0 ? `in ${c.daysToGoLive}d` : c.daysToGoLive === 0 ? "today" : `${-c.daysToGoLive}d ago`}</div>
                    </td>
                    <td>
                      <div className="meter-row">
                        <Meter value={c.readiness} marker={isLive(c.clinic.stage) ? undefined : pace} />
                        <span className="num">{c.readiness}%</span>
                      </div>
                    </td>
                    <td className="num">{c.atRisk ? <span className="pill pill-crit">{c.atRisk}</span> : <span className="fine">–</span>}</td>
                    <td className="num">
                      {met}/{c.benchmarks.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="section-head">
            <h2>Needs attention</h2>
            {atRisk.length > 1 && (
              <button className="btn btn-sm btn-primary" onClick={() => setRemind(atRisk.map((s) => s.staff.id))}>
                <Icon name="send" size={14} /> Remind all {atRisk.length}
              </button>
            )}
          </div>
          <ul className="attention">
            {atRisk.slice(0, 8).map((s) => {
              const clinic = state.clinics.find((c) => c.id === s.staff.clinicId)!;
              const stuck = s.modules.find((m) => m.proficiency === "retrain");
              return (
                <li key={s.staff.id}>
                  <Avatar name={s.staff.name} size={30} />
                  <div>
                    <Link to={`/team/clinic/${clinic.id}/staff/${s.staff.id}`} className="strong-link">
                      {s.staff.name}
                    </Link>
                    <span className="fine">
                      {" "}
                      · {ROLE_SHORT[s.staff.role]} · {clinic.name}
                    </span>
                    <div className="fine">
                      {stuck
                        ? stuck.recert
                          ? `Recertification required on “${MODULE_MAP[stuck.moduleId].title}”`
                          : `Failed “${MODULE_MAP[stuck.moduleId].title}” ${stuck.failedAttempts}×`
                        : s.certified === 0
                          ? `Hasn't started · last active ${relTime(s.staff.lastActiveAt)}`
                          : `${s.readiness}% ready · last active ${relTime(s.staff.lastActiveAt)}`}
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                  <button className="btn btn-sm btn-quiet" onClick={() => setRemind([s.staff.id])}>
                    <Icon name="send" size={14} /> Remind
                  </button>
                </li>
              );
            })}
            {overdue.map(({ c, b }) => (
              <li key={b.benchmark.id}>
                <span className="attention-icon">
                  <Icon name="flag" size={16} />
                </span>
                <div>
                  <Link to={`/team/clinic/${c.clinic.id}/benchmarks`} className="strong-link">
                    {b.benchmark.label}
                  </Link>
                  <div className="fine">
                    {c.clinic.name} · {b.detail} · due {fmtDate(b.benchmark.dueDate)}
                  </div>
                </div>
                <span className={`pill pill-${b.state === "overdue" ? "crit" : "warn"}`}>{b.state === "overdue" ? "Overdue" : "At risk"}</span>
                <span />
              </li>
            ))}
            {!atRisk.length && !overdue.length && <li className="fine">Nothing urgent. Every deployment is on pace.</li>}
          </ul>
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Live activity</h2>
            <span className="live">
              <span className="live-dot" /> real time
            </span>
          </div>
          <Feed events={state.events.filter((e) => e.type !== "stage")} limit={14} showClinic />
        </section>
      </div>
      {remind && <ReminderModal staffIds={remind} onClose={() => setRemind(null)} />}
    </div>
  );
}
