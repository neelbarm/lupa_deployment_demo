import { useEffect, useRef, useState, type ReactNode } from "react";
import { SPECIALIST } from "../../data/seed";
import { Link, useNav } from "../../router";
import { actions, useAppState } from "../../store";
import type { EventType } from "../../types";
import { Icon, LupaMark } from "../icons";
import { Avatar, Modal, toast } from "../primitives";

const LEARNER_EVENTS: Partial<Record<EventType, "good" | "info" | "warn" | "crit">> = {
  passed: "good",
  failed: "crit",
  started: "info",
  reminder_read: "info",
  login: "info",
  sim_error: "warn",
};

export function ConsoleShell({ children }: { children: ReactNode }) {
  const state = useAppState();
  const { path, embedded } = useNav();
  const [confirmReset, setConfirmReset] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastSeen = useRef(state.events[0]?.id);

  // Pop a toast when clinic staff do something, wherever they are.
  useEffect(() => {
    const newest = state.events[0];
    if (!newest || newest.id === lastSeen.current) return;
    const seenIdx = state.events.findIndex((e) => e.id === lastSeen.current);
    const fresh = seenIdx === -1 ? state.events.slice(0, 1) : state.events.slice(0, seenIdx);
    lastSeen.current = newest.id;
    for (const e of fresh.slice(0, 3).reverse()) {
      const tone = LEARNER_EVENTS[e.type];
      if (tone && Date.now() - e.ts < 5000) toast(e.text, tone);
    }
  }, [state.events]);

  useEffect(() => setMenuOpen(false), [path]);

  const active = (p: string) => (path === p || path.startsWith(p + "/") ? "is-active" : "");

  return (
    <div className={`console ${menuOpen ? "menu-open" : ""}`}>
      <aside className="console-side">
        <div className="console-brand">
          <LupaMark />
          <span>
            <strong>Lupa</strong>
            <em>Deployment Console</em>
          </span>
          <button className="icon-btn console-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <Icon name={menuOpen ? "x" : "tasks"} />
          </button>
        </div>
        <nav className="console-nav">
          <Link to="/team" className={path === "/team" ? "is-active" : ""}>
            <Icon name="chart" size={17} /> Portfolio
          </Link>
          <span className="console-nav-label">Clinics</span>
          {state.clinics.map((c) => (
            <Link key={c.id} to={`/team/clinic/${c.id}`} className={active(`/team/clinic/${c.id}`)}>
              <span className={`stage-dot stage-${c.stage.replace(/\s/g, "").toLowerCase()}`} />
              {c.name}
            </Link>
          ))}
          <span className="console-nav-label">Content</span>
          <Link to="/team/library" className={active("/team/library")}>
            <Icon name="book" size={17} /> Module library
          </Link>
        </nav>
        <div className="console-foot">
          <span className="live">
            <span className="live-dot" /> Live · syncing with clinic devices
          </span>
          {!embedded && (
            <>
              <Link to="/present" className="console-foot-link">
                <Icon name="layout" size={16} /> Presenter mode
              </Link>
              <Link to="/learn" className="console-foot-link">
                <Icon name="swap" size={16} /> Open clinic view
              </Link>
            </>
          )}
          <button className="console-foot-link" onClick={() => setConfirmReset(true)}>
            <Icon name="refresh" size={16} /> Reset demo data
          </button>
          <span className="me">
            <Avatar name={SPECIALIST} size={28} />
            <span>
              {SPECIALIST}
              <em>Deployment Specialist</em>
            </span>
          </span>
        </div>
      </aside>
      <main className="console-main">{children}</main>
      {confirmReset && (
        <Modal title="Reset demo data?" onClose={() => setConfirmReset(false)}>
          <p>This restores every clinic, learner, attempt and note to the starting demo state, in every open tab.</p>
          <div className="form-actions">
            <button className="btn btn-quiet" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                actions.resetDemo();
                setConfirmReset(false);
                toast("Demo data reset", "good");
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
