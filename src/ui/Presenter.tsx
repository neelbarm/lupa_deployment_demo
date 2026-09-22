import { useState } from "react";
import { MemoryRouter, Link } from "../router";
import { actions, useAppState } from "../store";
import { ROLE_SHORT } from "../types";
import { AppRoutes } from "./AppRoutes";
import { Icon } from "./icons";
import { Modal, toast } from "./primitives";
import { ThemeToggle } from "./ThemeToggle";

const DEFAULT_LEARNER = "riverside-jess.morales";


export function Presenter() {
  const state = useAppState();
  const [learner, setLearner] = useState(DEFAULT_LEARNER);
  const [reset, setReset] = useState(false);
  // Bumped on Reset so both panes remount at their starting screens.
  const [epoch, setEpoch] = useState(0);
  const staff = state.staff.find((s) => s.id === learner) ?? state.staff[0];
  const clinicId = staff.clinicId;
  const learners = state.staff;

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
            {state.clinics.map((c) => (
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
        <ThemeToggle />
        <button className="btn btn-sm btn-quiet" onClick={() => setReset(true)}>
          <Icon name="refresh" size={14} /> Reset
        </button>
        <Link to="/" className="btn btn-sm btn-quiet">
          Exit
        </Link>
      </header>

      <p className="presenter-narrow">Presenter mode is built for a laptop or larger screen. On a phone, the two views are stacked.</p>
      <div className="panes">
        <section className="pane pane-clinic" aria-label="Clinic view">
          <div className="pane-label">
            <span className="door-tag">Clinic-facing</span> What {staff.name} sees
          </div>
          <div className="pane-body app-root">
            <MemoryRouter initial={`/learn/${learner}`} key={`l${learner}${epoch}`}>
              <AppRoutes />
            </MemoryRouter>
          </div>
        </section>
        <section className="pane pane-team" aria-label="Lupa view">
          <div className="pane-label">
            <span className="door-tag door-tag-team">Lupa-facing</span> Deployment Console
          </div>
          <div className="pane-body app-root">
            <MemoryRouter initial={`/team/clinic/${clinicId}`} key={`t${clinicId}${epoch}`}>
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
                setEpoch((n) => n + 1);
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
