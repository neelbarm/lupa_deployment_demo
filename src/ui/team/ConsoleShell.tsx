import { useEffect, useRef, useState, type ReactNode } from "react";
import { SPECIALIST } from "../../data/seed";
import { Link, match, useNav } from "../../router";
import { actions, useAppState } from "../../store";
import type { EventType } from "../../types";
import { Icon, LupaWordmark } from "../icons";
import { Avatar, Modal, toast } from "../primitives";
import { ThemeToggle } from "../ThemeToggle";

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
  const { path, go, embedded } = useNav();
  const [confirmReset, setConfirmReset] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const lastSeen = useRef(state.events[0]?.id);
  const current = (match("/team/clinic/:cid", path) ?? match("/team/clinic/:cid/:tab", path) ?? match("/team/clinic/:cid/staff/:sid", path))?.cid;
  const clinic = state.clinics.find((c) => c.id === current);

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

  useEffect(() => setSwitcher(false), [path]);
  useEffect(() => {
    if (!switcher) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSwitcher(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [switcher]);
  const pick = (to: string) => {
    setSwitcher(false);
    go(to);
  };

  return (
    <div className="console">
      <header className="chrome">
        <Link to="/team" className="chrome-brand" title="Portfolio">
          <LupaWordmark tone="white" />
          <span className="chrome-tag">Deployment</span>
        </Link>

        <div className="switcher">
          <button className="switcher-btn" onClick={() => setSwitcher(!switcher)} aria-expanded={switcher}>
            <span className="switcher-name">{clinic ? clinic.name : "All clinics"}</span>
            <span className="switcher-sub">{clinic ? `${clinic.stage} · ${clinic.legacyPims} → Lupa` : `${state.clinics.length} deployments`}</span>
            <Icon name="chevron" size={14} />
          </button>
          {switcher && (
            <>
              <div className="switcher-scrim" onClick={() => setSwitcher(false)} />
              <div className="switcher-menu" role="menu">
                <button role="menuitem" onClick={() => pick("/team")} className={!clinic ? "is-on" : ""}>
                  <Icon name="grid" size={15} /> All clinics
                </button>
                {state.clinics.map((c) => (
                  <button role="menuitem" key={c.id} onClick={() => pick(`/team/clinic/${c.id}`)} className={c.id === current ? "is-on" : ""}>
                    <span className={`stage-dot stage-${c.stage.toLowerCase().replace(/\s/g, "")}`} />
                    <span>
                      {c.name}
                      <span className="fine block">{c.stage}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <nav className="chrome-nav" aria-label="Console">
          <Link to="/team" className={path === "/team" ? "is-active" : ""} title="Portfolio">
            <Icon name="grid" size={17} />
            <span>Portfolio</span>
          </Link>
          <Link to={`/team/clinic/${current ?? "riverside"}/staff`} className={path.includes("/staff") ? "is-active" : ""} title="Staff">
            <Icon name="users" size={17} />
            <span>Staff</span>
          </Link>
          <Link to={`/team/clinic/${current ?? "riverside"}/insights`} className={path.endsWith("/insights") ? "is-active" : ""} title="Insights">
            <Icon name="chart" size={17} />
            <span>Insights</span>
          </Link>
          <Link to="/team/library" className={path.startsWith("/team/library") ? "is-active" : ""} title="Module library">
            <Icon name="book" size={17} />
            <span>Library</span>
          </Link>
        </nav>

        <div className="chrome-right">
          <span className="live chrome-live" title="Syncing with clinic devices">
            <span className="live-dot" /> Live
          </span>
          {!embedded && <ThemeToggle />}
          {!embedded && (
            <>
              <Link to="/present" className="chrome-icon" title="Presenter mode">
                <Icon name="layout" size={17} />
              </Link>
              <Link to="/learn" className="chrome-icon" title="Open clinic view">
                <Icon name="swap" size={17} />
              </Link>
            </>
          )}
          {!embedded && (
            <button className="chrome-icon" onClick={() => setConfirmReset(true)} title="Reset demo data" aria-label="Reset demo data">
              <Icon name="refresh" size={17} />
            </button>
          )}
          <span className="chrome-me" title={`${SPECIALIST} · Deployment Specialist`}>
            <Avatar name={SPECIALIST} size={30} />
          </span>
        </div>
      </header>
      <main className="console-main">{children}</main>
      {confirmReset && (
        <Modal title="Reset demo data?" onClose={() => setConfirmReset(false)}>
          <p>Restores every clinic, learner and attempt to the starting state, in every open tab.</p>
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
