import { MODULES } from "../content/modules";
import { summarizeClinic } from "../logic/metrics";
import { Link } from "../router";
import { useAppState } from "../store";
import { Icon, LupaMark } from "./icons";

export function Landing() {
  const state = useAppState();
  const riv = summarizeClinic(state, "riverside");
  return (
    <div className="landing">
      <header className="landing-bar">
        <span className="brand">
          <LupaMark size={28} />
          <span>
            Lupa <em>Academy</em>
          </span>
        </span>
        <span className="spacer" />
        <Link to="/present" className="btn btn-sm btn-primary">
          <Icon name="layout" size={15} /> Presenter mode
        </Link>
      </header>

      <section className="landing-hero">
        <span className="eyebrow">Clinic onboarding for Lupa deployments</span>
        <h1>
          Every person at the clinic,
          <br /> ready for Lupa on go-live day.
        </h1>
        <p className="lede">
          Role-based training that starts from each person's old workflow, proven in hands-on simulations, and tracked live by Lupa's
          deployment team.
        </p>
      </section>

      <section className="doors">
        <Link to="/learn" className="door door-clinic">
          <span className="door-tag">Clinic-facing</span>
          <strong>Lupa Academy</strong>
          <p>Staff learn Lupa step by step. Each module is scored and gated.</p>
          <span className="door-cta">
            Sign in as clinic staff <Icon name="arrow" size={16} />
          </span>
        </Link>
        <Link to="/team" className="door door-team">
          <span className="door-tag">Lupa-facing</span>
          <strong>Deployment Console</strong>
          <p>Lupa tracks who knows what, nudges who's behind, and gates go-live.</p>
          <span className="door-cta">
            Open the console <Icon name="arrow" size={16} />
          </span>
        </Link>
        <Link to="/present" className="door door-present">
          <span className="door-tag">Best for demos</span>
          <strong>Presenter mode</strong>
          <p>Both side by side. Train on the left, watch Lupa react on the right.</p>
          <span className="door-cta">
            Launch side-by-side <Icon name="arrow" size={16} />
          </span>
        </Link>
      </section>

      <section className="how">
        <h2>How a clinic gets ready</h2>
        <ol className="how-steps">
          <li>
            <strong>Assign by role</strong>
            <p>{MODULES.length} modules, from vets to front desk.</p>
          </li>
          <li>
            <strong>Start from the old workflow</strong>
            <p>“How you do it in {riv.clinic.legacyPims}” → “how you'll do it in Lupa”.</p>
          </li>
          <li>
            <strong>Prove it, or retake it</strong>
            <p>Quiz, then a simulation. No moving on until it's right.</p>
          </li>
          <li>
            <strong>Lupa sees it live</strong>
            <p>Scores, mistakes and delays reach the console instantly.</p>
          </li>
        </ol>
      </section>
      <footer className="landing-foot fine">
        Demo data lives in your browser. Use Presenter mode or two tabs to see live sync.
      </footer>
    </div>
  );
}
