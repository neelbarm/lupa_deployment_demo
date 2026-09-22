import { MODULE_MAP, MODULES, ROLE_PATHS } from "../../content/modules";
import { Link } from "../../router";
import { useAppState } from "../../store";
import { ROLE_LABELS, ROLES } from "../../types";
import { CategoryTile, Icon } from "../icons";

export function Library() {
  const state = useAppState();
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Curriculum</span>
        <h1>Module library</h1>
        <p className="lede">{MODULES.length} modules. Each one: old workflow → Lupa, a quiz, then a gated hands-on simulation.</p>
      </header>

      <section className="panel">
        <div className="section-head">
          <h2>Learning paths by role</h2>
        </div>
        <div className="paths">
          {ROLES.map((r) => (
            <div key={r} className="role-path">
              <strong>{ROLE_LABELS[r]}</strong>
              <ol>
                {ROLE_PATHS[r].map((id) => (
                  <li key={id}>
                    <Link to={`/team/library/${id}`}>{MODULE_MAP[id].title}</Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <div className="lib-grid">
        {MODULES.map((m) => {
          const passes = state.attempts.filter((a) => a.moduleId === m.id && a.passed).length;
          return (
            <Link key={m.id} to={`/team/library/${m.id}`} className="lib-card">
              <CategoryTile category={m.category} />
              <span className="eyebrow">
                {m.category} · ~{m.minutes} min
              </span>
              <strong>{m.title}</strong>
              <p>{m.summary}</p>
              <span className="fine">
                {m.quiz.length} questions · {m.sim.steps.length}-step simulation · pass {m.passScore}% · {passes} certifications
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function LibraryModule({ moduleId }: { moduleId: string }) {
  const m = MODULE_MAP[moduleId];
  if (!m) return <div className="page">Module not found.</div>;
  return (
    <div className="page narrow-wide">
      <Link to="/team/library" className="back-link">
        <Icon name="back" size={16} /> Module library
      </Link>
      <header className="page-head row">
        <div>
          <span className="eyebrow">
            {m.category} · ~{m.minutes} min · pass mark {m.passScore}% · for {m.roles.map((r) => ROLE_LABELS[r]).join(", ")}
          </span>
          <h1>{m.title}</h1>
          <p className="lede">{m.summary}</p>
        </div>
        <Link to={`/team/library/${m.id}/try`} className="btn btn-primary">
          <Icon name="play" size={15} /> Try it as a learner
        </Link>
      </header>
      <div className="grid-2">
        <section className="panel">
          <h2>Workflow change</h2>
          <div className="compare compact">
            <div className="compare-col compare-old">
              <span className="eyebrow">Legacy PIMS</span>
              <ol>
                {m.oldWay.map((s, i) => (
                  <li key={i}>{s.replaceAll("{pims}", "the legacy PIMS")}</li>
                ))}
              </ol>
            </div>
            <div className="compare-col compare-new">
              <span className="eyebrow">Lupa</span>
              <ol>
                {m.newWay.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section className="panel">
          <h2>Simulation · {m.sim.steps.length} steps</h2>
          <p className="fine">{m.sim.scenario}</p>
          <ol className="step-list">
            {m.sim.steps.map((s) => (
              <li key={s.id}>
                {s.instruction}
                {s.wrong && Object.keys(s.wrong).length > 0 && <span className="fine block">Common trap: {Object.values(s.wrong)[0]}</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="panel">
        <h2>Knowledge check</h2>
        <ol className="step-list">
          {m.quiz.map((q) => (
            <li key={q.id}>
              {q.prompt}
              <span className="fine block">Answer: {q.options[q.correct]}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
