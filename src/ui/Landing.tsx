import { MODULES } from "../content/modules";
import { Link } from "../router";
import { STAGES } from "../types";
import { Icon, LupaWordmark } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

const PHASE_COPY: Record<string, string> = {
  Scoping: "Map each role's current workflow.",
  Configuration: "Data migrated. Staff invited to their paths.",
  Training: "Scenario-based modules, scored and gated.",
  "Go-live": "Only when benchmarks say the team is ready.",
  Hypercare: "Recertify anyone who slips.",
};

export function Landing() {
  return (
    <div className="landing">
      <section className="hero-band">
        <header className="landing-nav">
          <span className="chrome-brand">
            <LupaWordmark tone="white" />
            <span className="chrome-tag chrome-tag-academy">Academy</span>
          </span>
          <span className="spacer" />
          <ThemeToggle />
          <Link to="/learn" className="btn btn-sm btn-outline-white">
            Clinic sign in
          </Link>
          <Link to="/present" className="btn btn-sm btn-mint">
            Presenter mode
          </Link>
        </header>

        <div className="hero-inner">
          <h1>Every person ready on go-live day.</h1>
          <p>Clinic staff learn Lupa from the workflows they already know. Lupa's deployment team sees who's ready, live.</p>
          <div className="hero-ctas">
            <Link to="/present" className="btn btn-lg btn-mint">
              <Icon name="play" size={16} /> Launch the demo
            </Link>
            <Link to="/team" className="btn btn-lg btn-outline-white">
              Open the console
            </Link>
          </div>
        </div>

        <div className="doors">
          <Link to="/learn" className="door">
            <span className="tile tile-mint">
              <Icon name="book" size={20} />
            </span>
            <strong>Lupa Academy</strong>
            <p>What clinic staff see. Old workflow → Lupa, then prove it.</p>
            <span className="door-cta">
              Sign in as staff <Icon name="arrow" size={15} />
            </span>
          </Link>
          <Link to="/team" className="door">
            <span className="tile tile-violet">
              <Icon name="chart" size={20} />
            </span>
            <strong>Deployment Console</strong>
            <p>What Lupa sees. Readiness, gaps, reminders, go-live gates.</p>
            <span className="door-cta">
              Open console <Icon name="arrow" size={15} />
            </span>
          </Link>
          <Link to="/present" className="door">
            <span className="tile tile-amber">
              <Icon name="layout" size={20} />
            </span>
            <strong>Presenter mode</strong>
            <p>Both side by side. Train left, watch Lupa react right.</p>
            <span className="door-cta">
              Launch <Icon name="arrow" size={15} />
            </span>
          </Link>
        </div>
      </section>

      <section className="phase-band">
        <h2>Built into Lupa's migration playbook</h2>
        <ol className="phase-cards">
          {STAGES.map((st, i) => (
            <li key={st} className={st === "Training" ? "is-hero" : ""}>
              <span className="phase-num">{i + 1}</span>
              <strong>{st}</strong>
              <p>{PHASE_COPY[st]}</p>
              {st === "Training" && <span className="pill pill-accent">Lupa Academy</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="navy-band">
        <div>
          <strong className="num">{MODULES.length}</strong>
          <span>workflow modules</span>
        </div>
        <div>
          <strong className="num">4</strong>
          <span>roles, vet to front desk</span>
        </div>
        <div>
          <strong className="num">0</strong>
          <span>steps skipped. Every one is proven</span>
        </div>
        <div>
          <strong>Live</strong>
          <span>every score reaches Lupa instantly</span>
        </div>
      </section>

      <footer className="landing-foot fine">Demo data lives in your browser. Reset anytime from the console.</footer>
    </div>
  );
}
