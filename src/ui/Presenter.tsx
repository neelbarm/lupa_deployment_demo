import { useState } from "react";
import { MemoryRouter, Link } from "../router";
import { actions, useAppState } from "../store";
import { ROLE_SHORT } from "../types";
import { AppRoutes } from "./AppRoutes";
import { Icon } from "./icons";
import { Modal, toast } from "./primitives";

const DEFAULT_LEARNER = "riverside-jess.morales";

const SCRIPT = [
  ["The problem", "Riverside goes live in 9 days. Jess (front desk) hasn't started, so the console flags her as at risk."],
  ["Nudge", "Right: click Remind next to Jess and send it. It lands on her screen instantly."],
  ["Read receipt", "Left: mark the reminder read. The console records it."],
  ["Old → new", "Left: start Lupa Fundamentals. Cornerstone workflow vs. the Lupa way, then the lesson."],
  ["Gated quiz", "Answer the knowledge check. Under 67% means retake, no simulation."],
  ["Prove it", "In the simulation, open the wrong ‘Biscotti’ record once. Watch the console log the mistake live."],
  ["Certified", "Finish the workflow. Score posts, next module unlocks, readiness and skill matrix update."],
  ["Coach", "Right: Insights shows where the clinic struggles. Open Dr. Patel to see his exact mistakes."],
];

export function Presenter() {
  const state = useAppState();
  const [learner, setLearner] = useState(DEFAULT_LEARNER);
  const [script, setScript] = useState(true);
  const [step, setStep] = useState(0);
  const [reset, setReset] = useState(false);
  const staff = state.staff.find((s) => s.id === learner) ?? state.staff[0];
  const clinicId = staff.clinicId;
  const learners = state.staff.filter((s) => state.clinics.find((c) => c.id === s.clinicId)?.stage !== "Live");

  return (
    <div className="presenter">
      <header className="presenter-bar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Icon name="layout" size={15} />
          </span>
          <span>Presenter mode</span>
        </Link>
        <label className="presenter-pick">
          <span className="fine">Clinic learner</span>
          <select id="presenter-learner" value={learner} onChange={(e) => setLearner(e.target.value)}>
            {state.clinics
              .filter((c) => c.stage !== "Live")
              .map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {learners
                    .filter((s) => s.clinicId === c.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {ROLE_SHORT[s.role]}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
        </label>
        <span className="spacer" />
        <button className={`btn btn-sm ${script ? "btn-primary" : "btn-quiet"}`} onClick={() => setScript(!script)}>
          <Icon name="note" size={14} /> Demo script
        </button>
        <button className="btn btn-sm btn-quiet" onClick={() => setReset(true)}>
          <Icon name="refresh" size={14} /> Reset
        </button>
        <Link to="/" className="btn btn-sm btn-quiet">
          Exit
        </Link>
      </header>

      {script && (
        <div className="script" role="region" aria-label="Demo script">
          <span className="script-count num">
            {step + 1}/{SCRIPT.length}
          </span>
          <div className="script-text" key={step}>
            <strong>{SCRIPT[step][0]}</strong> {SCRIPT[step][1]}
          </div>
          <button className="icon-btn" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous step">
            <Icon name="back" size={16} />
          </button>
          <button className="icon-btn" onClick={() => setStep(Math.min(SCRIPT.length - 1, step + 1))} disabled={step === SCRIPT.length - 1} aria-label="Next step">
            <Icon name="arrow" size={16} />
          </button>
        </div>
      )}

      <div className="panes">
        <section className="pane pane-clinic" aria-label="Clinic view">
          <div className="pane-label">
            <span className="door-tag">Clinic-facing</span> What {staff.name} sees
          </div>
          <div className="pane-body app-root">
            <MemoryRouter initial={`/learn/${learner}`} key={"l" + learner}>
              <AppRoutes />
            </MemoryRouter>
          </div>
        </section>
        <section className="pane pane-team" aria-label="Lupa view">
          <div className="pane-label">
            <span className="door-tag door-tag-team">Lupa-facing</span> Deployment Console
          </div>
          <div className="pane-body app-root">
            <MemoryRouter initial={`/team/clinic/${clinicId}`} key={"t" + clinicId}>
              <AppRoutes />
            </MemoryRouter>
          </div>
        </section>
      </div>
      {reset && (
        <Modal title="Reset demo data?" onClose={() => setReset(false)}>
          <p>Restores every clinic, learner and attempt to the starting state so you can run the demo again.</p>
          <div className="form-actions">
            <button className="btn btn-quiet" onClick={() => setReset(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                actions.resetDemo();
                setReset(false);
                setLearner(DEFAULT_LEARNER);
                toast("Demo reset", "good");
              }}
            >
              Reset
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
