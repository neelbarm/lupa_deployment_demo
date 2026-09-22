import { useEffect, useState } from "react";
import { MODULE_MAP } from "../../content/modules";
import { DAY, fmtDate, isCertified, relTime, summarizeClinic, summarizeStaff } from "../../logic/metrics";
import { Link, useNav } from "../../router";
import { actions, greetingName, useAppState } from "../../store";
import { ROLE_LABELS, ROLES } from "../../types";
import { Icon } from "../icons";
import { Avatar, Meter, ProficiencyPill, Ring, useTick } from "../primitives";

/** Stand-in for the magic-link login each staff member gets in their invite email. */
export function LearnLogin() {
  const state = useAppState();
  const [clinicId, setClinicId] = useState("riverside");
  const clinic = state.clinics.find((c) => c.id === clinicId)!;
  const staff = state.staff.filter((s) => s.clinicId === clinicId);
  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="eyebrow">Lupa Academy · clinic sign-in</span>
        <h1>Who's training today?</h1>
        <p className="lede">In production, staff sign in from their invite email. Here, pick anyone.</p>
      </header>
      <div className="seg" role="tablist">
        {state.clinics
          .filter((c) => c.stage !== "Live")
          .map((c) => (
            <button key={c.id} role="tab" aria-selected={c.id === clinicId} className={c.id === clinicId ? "is-on" : ""} onClick={() => setClinicId(c.id)}>
              {c.name}
            </button>
          ))}
      </div>
      <p className="fine">
        Switching from <strong>{clinic.legacyPims}</strong> · go-live {new Date(clinic.goLiveDate).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
      </p>
      {ROLES.map((role) => {
        const group = staff.filter((s) => s.role === role);
        if (!group.length) return null;
        return (
          <section key={role} className="login-group">
            <h3>{ROLE_LABELS[role]}</h3>
            <div className="login-grid">
              {group.map((s) => {
                const sum = summarizeStaff(state, s);
                return (
                  <Link key={s.id} to={`/learn/${s.id}`} className="login-tile">
                    <Avatar name={s.name} size={38} />
                    <span className="login-name">
                      <strong>{s.name}</strong>
                      <span className="fine">
                        {sum.certified}/{sum.total} modules · {s.lastActiveAt ? `active ${relTime(s.lastActiveAt)}` : "not started"}
                      </span>
                    </span>
                    <Icon name="arrow" size={16} />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function LearnerHome({ staffId }: { staffId: string }) {
  const state = useAppState();
  useTick();
  const staff = state.staff.find((s) => s.id === staffId);
  useEffect(() => {
    if (staff) actions.learnerLogin(staff.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);
  if (!staff) return <div className="page">Staff member not found.</div>;
  const clinic = state.clinics.find((c) => c.id === staff.clinicId)!;
  const sum = summarizeStaff(state, staff);
  const days = Math.ceil((clinic.goLiveDate - Date.now()) / DAY);
  const unread = state.reminders.filter((r) => r.staffId === staff.id && !r.readAt).sort((a, b) => b.ts - a.ts);
  const next = sum.modules.find((m) => !isCertified(m));
  const inProgress = state.progress.find((p) => p.staffId === staff.id);
  const overdue = sum.modules.filter((m) => m.overdue);
  const team = summarizeClinic(state, clinic.id);
  const myRank = [...team.staff].sort((a, b) => b.readiness - a.readiness).findIndex((x) => x.staff.id === staff.id) + 1;

  return (
    <div className="page">
      <header className="learner-hero">
        <div className="learner-hero-copy">
          <span className="eyebrow">
            {clinic.name} · {ROLE_LABELS[staff.role]}
          </span>
          <h1>Hi {greetingName(staff.name)}, let's get you ready for Lupa.</h1>
          <p className="lede">
            {days > 0 ? `${clinic.name} moves from ${clinic.legacyPims} to Lupa in ${days} day${days === 1 ? "" : "s"}.` : `${clinic.name} is live on Lupa.`}
          </p>
          {next && (
            <Link to={`/learn/${staff.id}/m/${next.moduleId}`} className="btn btn-primary btn-lg">
              <Icon name="play" size={16} /> {inProgress || sum.certified > 0 ? "Continue" : "Start"}: {MODULE_MAP[next.moduleId].title}
            </Link>
          )}
          {!next && <p className="score-chip good">All modules certified: you're go-live ready.</p>}
          {overdue.length > 0 && (
            <p className="overdue-note">
              <Icon name="flag" size={15} /> {overdue.length} module{overdue.length > 1 ? "s" : ""} overdue. Visible to your manager and Lupa.
            </p>
          )}
          {next && !overdue.length && (
            <p className="fine">
              Next due: <strong>{MODULE_MAP[next.moduleId].title}</strong> by {fmtDate(next.dueDate)}
            </p>
          )}
        </div>
        <Ring value={sum.readiness} size={140} label="ready" />
      </header>

      {unread.length > 0 && (
        <section className="inbox">
          {unread.map((r) => (
            <div className="inbox-msg" key={r.id}>
              <Icon name="bell" size={18} />
              <div>
                <span className="eyebrow">
                  From {r.from} · Lupa deployment team · {relTime(r.ts)}
                </span>
                <p>{r.message}</p>
              </div>
              <div className="inbox-actions">
                {r.moduleId && sum.modules.find((m) => m.moduleId === r.moduleId)?.unlocked && (
                  <Link
                    to={`/learn/${staff.id}/m/${r.moduleId}`}
                    className="btn btn-sm btn-primary"
                  >
                    Open module
                  </Link>
                )}
                <button className="btn btn-sm btn-quiet" onClick={() => actions.markReminderRead(r.id)}>
                  Mark as read
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Your learning path</h2>
          <span className="fine">
            {sum.certified}/{sum.total} certified
          </span>
        </div>
        <ol className="path">
          {sum.modules.map((m, i) => {
            const mod = MODULE_MAP[m.moduleId];
            const cert = isCertified(m);
            const locked = !m.unlocked;
            const extra = staff.extraModules.includes(m.moduleId);
            return (
              <li key={m.moduleId} className={`path-item ${cert ? "is-cert" : ""} ${locked ? "is-locked" : ""} ${m === next ? "is-next" : ""}`}>
                <span className="path-node">{cert ? <Icon name="check" size={16} /> : locked ? <Icon name="lock" size={14} /> : i + 1}</span>
                <div className="path-body">
                  <div className="path-top">
                    <strong>{mod.title}</strong>
                    {extra && <span className="pill pill-info">Assigned by Lupa</span>}
                    {m.overdue && <span className="pill pill-crit">Overdue</span>}
                    {m.proficiency !== "not_started" && <ProficiencyPill p={m.proficiency} />}
                  </div>
                  <span className="fine">
                    ~{mod.minutes} min · pass mark {mod.passScore}%
                    {m.best ? ` · best score ${m.best.score}%` : ""}
                    {m.attempts ? ` · ${m.attempts} attempt${m.attempts > 1 ? "s" : ""}` : ""}
                    {!cert && ` · due ${fmtDate(m.dueDate)}`}
                  </span>
                </div>
                <div className="path-cta">
                  {locked ? (
                    <span className="fine">Locked</span>
                  ) : (
                    <Link to={`/learn/${staff.id}/m/${m.moduleId}`} className={`btn btn-sm ${cert ? "btn-quiet" : "btn-primary"}`}>
                      {cert ? "Practise" : m.proficiency === "retrain" ? "Retake" : m.proficiency === "in_progress" ? "Resume" : "Start"}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel team-board">
        <div className="section-head">
          <h2>Your team</h2>
          <span className="fine">
            Clinic is {team.readiness}% ready · you're #{myRank} of {team.staff.length}
          </span>
        </div>
        <ul className="team-list">
          {[...team.staff]
            .sort((a, b) => b.readiness - a.readiness)
            .map((t) => (
              <li key={t.staff.id} className={t.staff.id === staff.id ? "is-me" : ""}>
                <Avatar name={t.staff.name} size={26} />
                <span className="team-name">
                  {t.staff.id === staff.id ? "You" : t.staff.name}
                  <span className="fine"> · {ROLE_LABELS[t.staff.role]}</span>
                </span>
                <Meter value={t.readiness} />
                <span className="num fine">
                  {t.certified}/{t.total}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

export function LearnerShell({ staffId, children }: { staffId?: string; children: React.ReactNode }) {
  const state = useAppState();
  const { go, embedded } = useNav();
  const staff = staffId ? state.staff.find((s) => s.id === staffId) : undefined;
  const unread = staff ? state.reminders.filter((r) => r.staffId === staff.id && !r.readAt).length : 0;
  return (
    <div className="learner-shell">
      <header className="learner-bar">
        <Link to={staff ? `/learn/${staff.id}` : "/learn"} className="brand">
          <span className="brand-mark">
            <Icon name="book" size={16} />
          </span>
          <span>
            Lupa <em>Academy</em>
          </span>
        </Link>
        <span className="learner-bar-tag">Clinic view</span>
        <span className="spacer" />
        {staff && (
          <>
            <span className={`bell ${unread ? "has-unread" : ""}`} title={`${unread} unread reminder(s)`} onClick={() => go(`/learn/${staff.id}`)}>
              <Icon name="bell" size={18} />
              {unread > 0 && <b>{unread}</b>}
            </span>
            <span className="who">
              <Avatar name={staff.name} size={28} />
              <span className="who-name">{staff.name}</span>
            </span>
            <button className="btn btn-sm btn-quiet" onClick={() => go("/learn")}>
              Switch user
            </button>
          </>
        )}
        {!embedded && (
          <Link to="/" className="btn btn-sm btn-quiet">
            Exit
          </Link>
        )}
      </header>
      <main className="learner-main">{children}</main>
    </div>
  );
}
