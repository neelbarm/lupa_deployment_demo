import { useEffect, useMemo, useRef, useState } from "react";
import { HINT_PENALTY, ERROR_PENALTY, simScore, valueMatches } from "../../logic/scoring";
import type { NavKey, SimItem, TrainingModule } from "../../types";
import { Icon, LupaMark, type IconName } from "../icons";

export interface SimResult {
  errors: number;
  hints: number;
  mistakes: { stepId: string; clicked: string }[];
  durationSec: number;
}

const NAV: { key: NavKey; label: string; icon: IconName }[] = [
  { key: "home", label: "Dashboard", icon: "home" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "patients", label: "Patients", icon: "paw" },
  { key: "consult", label: "Consults", icon: "steth" },
  { key: "messages", label: "Messages", icon: "chat" },
  { key: "billing", label: "Billing", icon: "card" },
  { key: "tasks", label: "Tasks", icon: "tasks" },
  { key: "inventory", label: "Inventory", icon: "box" },
  { key: "rota", label: "Rota", icon: "users" },
  { key: "reports", label: "Reports", icon: "chart" },
];

interface Props {
  module: TrainingModule;
  clinicName: string;
  onError?: (stepIndex: number, errors: number, instruction: string) => void;
  onStep?: (stepIndex: number, errors: number) => void;
  onComplete: (r: SimResult) => void;
}

export function Simulator({ module, clinicName, onError, onStep, onComplete }: Props) {
  const { sim } = module;
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [mistakes, setMistakes] = useState<SimResult["mistakes"]>([]);
  const [feedback, setFeedback] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [shake, setShake] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const started = useRef(Date.now());
  const finished = idx >= sim.steps.length;
  const step = sim.steps[Math.min(idx, sim.steps.length - 1)];
  const screen = sim.screens.find((s) => s.id === step.screen) ?? sim.screens[0];

  useEffect(() => {
    setHintOpen(false);
  }, [idx]);

  const visible = (it: SimItem) => (!it.showAfter || done.has(it.showAfter)) && (!it.hideAfter || !done.has(it.hideAfter));

  function attempt(elementId: string, value?: string) {
    if (finished) return;
    const correctTarget = elementId === step.target;
    const correctValue = step.value === undefined || (value !== undefined && valueMatches(value, step.value));
    if (correctTarget && correctValue) {
      const nextDone = new Set(done).add(step.id);
      setDone(nextDone);
      const isRow = sim.screens.some((s) => s.sections.some((sec) => sec.items.some((i) => i.kind === "row" && i.id === elementId)));
      if (isRow) setSelectedRows(new Set(selectedRows).add(elementId));
      setFeedback({ tone: "good", text: step.why ?? "Correct." });
      const next = idx + 1;
      setIdx(next);
      onStep?.(next, errors);
      if (next >= sim.steps.length) {
        onComplete({ errors, hints, mistakes, durationSec: Math.round((Date.now() - started.current) / 1000) });
      }
      return;
    }
    const clicked = correctTarget && value !== undefined ? `value:${value}` : elementId;
    const e = errors + 1;
    setErrors(e);
    setMistakes([...mistakes, { stepId: step.id, clicked }]);
    const tailored = step.wrong?.[elementId];
    setFeedback({
      tone: "bad",
      text:
        tailored ??
        (correctTarget
          ? "Right place, but that's not the correct value for this situation. Re-read the task."
          : "Not quite. That isn't the next step in this workflow. Re-read the task or use a hint."),
    });
    setShake((s) => s + 1);
    if (correctTarget && value !== undefined) setValues((v) => ({ ...v, [elementId]: "" }));
    onError?.(idx, e, step.instruction);
  }

  function revealHint() {
    if (hintOpen || finished) return;
    setHintOpen(true);
    setHints((h) => h + 1);
  }

  const liveScore = simScore(errors, hints);
  const highlight = hintOpen ? step.target : null;

  const progressList = useMemo(() => sim.steps.map((s, i) => ({ s, i })), [sim.steps]);

  return (
    <div className="sim">
      <aside className="sim-brief">
        <div className="sim-brief-head">
          <span className="eyebrow">Hands-on simulation</span>
          <p className="sim-scenario">{sim.scenario}</p>
        </div>

        <ol className="sim-steps">
          {progressList.map(({ s, i }) => (
            <li key={s.id} className={i < idx ? "is-done" : i === idx && !finished ? "is-current" : "is-future"}>
              <span className="sim-step-dot">{i < idx ? <Icon name="check" size={13} /> : i + 1}</span>
              <span>{i <= idx || finished ? s.instruction : "Locked until the previous step is correct"}</span>
            </li>
          ))}
        </ol>

        {!finished && (
          <div className={`sim-task ${feedback?.tone === "bad" ? "is-bad" : ""}`} key={shake}>
            <span className="eyebrow">
              Step {idx + 1} of {sim.steps.length}
            </span>
            <strong>{step.instruction}</strong>
            {hintOpen ? (
              <p className="sim-hint">
                <Icon name="hint" size={16} /> {step.hint}
              </p>
            ) : (
              <button className="btn btn-quiet btn-sm" onClick={revealHint}>
                <Icon name="hint" size={15} /> Hint
              </button>
            )}
          </div>
        )}

        {/* Always rendered so the first message doesn't push the simulated app down. */}
        <div className="sim-feedback-slot" role="status" aria-live="polite">
          {feedback && <div className={`sim-feedback ${feedback.tone === "good" ? "is-good" : "is-bad"}`}>{feedback.text}</div>}
        </div>

        <div className="sim-scoreline">
          <div>
            <span className="eyebrow">Workflow score</span>
            <strong className="num">{liveScore}</strong>
          </div>
          <div>
            <span className="eyebrow">Wrong moves</span>
            <strong className="num">{errors}</strong>
          </div>
          <div>
            <span className="eyebrow">Hints</span>
            <strong className="num">{hints}</strong>
          </div>
        </div>
        <p className="fine">Wrong move −{ERROR_PENALTY} · hint −{HINT_PENALTY}</p>
      </aside>

      <div className={`lupa-app ${finished ? "is-finished" : ""}`}>
        <div className="lupa-top">
          <span className="lupa-site">
            <span className="lupa-site-logo">
              <LupaMark size={22} tone="white" />
            </span>
            <span>
              <strong>{clinicName}</strong>
              <em>Training mode</em>
            </span>
            <Icon name="chevron" size={13} />
          </span>
          <nav className="lupa-nav" aria-label="Lupa navigation (simulated)">
            {NAV.map((n) => {
              const id = `nav:${n.key}`;
              const active = screen.nav === n.key;
              return (
                <button
                  key={n.key}
                  className={`lupa-nav-item ${active ? "is-active" : ""} ${highlight === id ? "is-hint" : ""}`}
                  onClick={() => (active && step.target !== id ? undefined : attempt(id))}
                  disabled={finished}
                  title={n.label}
                >
                  <Icon name={n.icon} size={16} />
                  <span>{n.label}</span>
                </button>
              );
            })}
          </nav>
          <span className="lupa-tools">
            <Icon name="search" size={16} />
            <Icon name="bell" size={16} />
          </span>
        </div>
        <div className="lupa-body">
          <main className="lupa-screen">
            <header className="lupa-screen-head">
              <h4>{screen.title}</h4>
              {screen.subtitle && <p>{screen.subtitle}</p>}
            </header>
            <div className="lupa-sections">
              {screen.sections.map((sec, si) => {
                const items = sec.items.filter(visible);
                if (!items.length) return null;
                return (
                  <section key={si} className={`lupa-section ${sec.span === "half" ? "is-half" : ""} layout-${sec.layout ?? "stack"}`}>
                    {sec.title && <h5>{sec.title}</h5>}
                    {sec.layout === "table" ? (
                      <div className="lupa-table" role="table">
                        {sec.columns && (
                          <div className="lupa-tr lupa-th" role="row" style={{ gridTemplateColumns: `repeat(${sec.columns.length}, minmax(0,1fr))` }}>
                            {sec.columns.map((c) => (
                              <span key={c} role="columnheader">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        {items.map((it) =>
                          it.kind === "row" ? (
                            <button
                              key={it.id}
                              role="row"
                              className={`lupa-tr ${selectedRows.has(it.id) ? "is-selected" : ""} ${highlight === it.id ? "is-hint" : ""}`}
                              style={{ gridTemplateColumns: `repeat(${it.cells.length}, minmax(0,1fr))` }}
                              onClick={() => attempt(it.id)}
                              disabled={finished}
                            >
                              {it.cells.map((c, ci) => (
                                <span key={ci} role="cell">
                                  {c}
                                  {ci === 0 && it.badge && <em className="lupa-badge">{it.badge}</em>}
                                </span>
                              ))}
                            </button>
                          ) : (
                            <Item key={si + "-" + JSON.stringify(it)} it={it} />
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="lupa-items">
                        {items.map((it, ii) => (
                          <Item
                            key={("id" in it ? it.id : "") + ii}
                            it={it}
                            highlight={highlight}
                            finished={finished}
                            value={"id" in it ? values[it.id] ?? "" : ""}
                            setValue={(id, v) => setValues((x) => ({ ...x, [id]: v }))}
                            attempt={attempt}
                            doneTarget={"id" in it && sim.steps.some((s) => s.target === it.id && done.has(s.id))}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </main>
        </div>
        {finished && (
          <div className="lupa-complete">
            <Icon name="check" size={28} />
            <strong>Workflow complete</strong>
          </div>
        )}
      </div>
    </div>
  );
}

function Item({
  it,
  highlight,
  finished,
  value = "",
  setValue,
  attempt,
  doneTarget,
}: {
  it: SimItem;
  highlight?: string | null;
  finished?: boolean;
  value?: string;
  setValue?: (id: string, v: string) => void;
  attempt?: (id: string, value?: string) => void;
  doneTarget?: boolean;
}) {
  switch (it.kind) {
    case "text":
      return <p className={`lupa-text tone-${it.tone ?? "plain"}`}>{it.text}</p>;
    case "kv":
      return (
        <dl className="lupa-kv">
          {it.pairs.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      );
    case "button":
      return (
        <button
          className={`lupa-btn lupa-btn-${it.variant ?? "ghost"} ${highlight === it.id ? "is-hint" : ""} ${doneTarget ? "is-used" : ""}`}
          onClick={() => attempt?.(it.id)}
          disabled={finished || doneTarget}
        >
          {doneTarget && <Icon name="check" size={14} />} {it.label}
        </button>
      );
    case "select":
      return (
        <label className={`lupa-field ${highlight === it.id ? "is-hint" : ""}`}>
          <span>{it.label}</span>
          <select
            id={`sim-${it.id}`}
            value={value}
            disabled={finished || doneTarget}
            onChange={(e) => {
              setValue?.(it.id, e.target.value);
              if (e.target.value) attempt?.(it.id, e.target.value);
            }}
          >
            <option value="">Select…</option>
            {it.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      );
    case "input":
      return (
        <form
          className={`lupa-field ${highlight === it.id ? "is-hint" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) attempt?.(it.id, value);
          }}
        >
          <span>{it.label}</span>
          <span className="lupa-input-row">
            <input
              id={`sim-${it.id}`}
              value={value}
              placeholder={it.placeholder}
              disabled={finished || doneTarget}
              onChange={(e) => setValue?.(it.id, e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="lupa-enter" disabled={finished || doneTarget} aria-label="Submit">
              Enter ↵
            </button>
          </span>
        </form>
      );
    default:
      return null;
  }
}
