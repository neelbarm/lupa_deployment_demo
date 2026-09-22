import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Proficiency, StaffStatus, BenchmarkState } from "../logic/metrics";
import { PROFICIENCY_LABEL, STATUS_LABEL } from "../logic/metrics";
import { Icon } from "./icons";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const clean = name.replace(/^Dr\.\s*/, "");
  const initials = clean
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  let h = 0;
  for (const c of clean) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, ["--h" as string]: String(h) }}>
      {initials}
    </span>
  );
}

const STATUS_TONE: Record<StaffStatus, string> = {
  certified: "good",
  on_track: "info",
  behind: "warn",
  at_risk: "crit",
  not_started: "mute",
};

export function StatusPill({ status }: { status: StaffStatus }) {
  return <span className={`pill pill-${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}

const PROF_TONE: Record<Proficiency, string> = {
  mastered: "good",
  proficient: "good",
  retrain: "crit",
  in_progress: "info",
  not_started: "mute",
};

export function ProficiencyPill({ p, recert }: { p: Proficiency; recert?: boolean }) {
  if (recert) return <span className="pill pill-warn">Recertification required</span>;
  return <span className={`pill pill-${PROF_TONE[p]}`}>{PROFICIENCY_LABEL[p]}</span>;
}

const BENCH: Record<BenchmarkState, [string, string]> = {
  met: ["good", "Met"],
  on_track: ["info", "On track"],
  at_risk: ["warn", "At risk"],
  overdue: ["crit", "Overdue"],
};

export function BenchPill({ state }: { state: BenchmarkState }) {
  const [tone, label] = BENCH[state];
  return <span className={`pill pill-${tone}`}>{label}</span>;
}

export function Meter({ value: target, tone, marker }: { value: number; tone?: string; marker?: number }) {
  // Render at the real value; the CSS width transition animates later live changes.
  const value = target;
  const t = tone ?? (target >= 90 ? "good" : target >= 35 ? "info" : target >= 15 ? "warn" : "crit");
  return (
    <span className="meter" role="meter" aria-valuenow={target} aria-valuemin={0} aria-valuemax={100}>
      <span className={`meter-fill tone-${t}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      {marker !== undefined && <span className="meter-marker" style={{ left: `${marker}%` }} title={`Expected: ${marker}%`} />}
    </span>
  );
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Show `value`, animating from the previous value when it changes (e.g. a live readiness update).
 * Opens at the real value so nothing appears to "jump" when a page loads; `fromZero` opts into a reveal.
 */
export function useCountUp(value: number, ms = 700, fromZero = false): number {
  const [shown, setShown] = useState(fromZero && !reducedMotion() ? 0 : value);
  const from = useRef(shown);
  useEffect(() => {
    if (from.current === value || reducedMotion()) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(a + (value - a) * eased);
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export function CountUp({ value, suffix = "", fromZero = false }: { value: number; suffix?: string; fromZero?: boolean }) {
  const v = useCountUp(value, 700, fromZero);
  return (
    <>
      {v}
      {suffix}
    </>
  );
}

export function Ring({ value: target, size = 120, label }: { value: number; size?: number; label?: string }) {
  const value = useCountUp(target, 900);
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const tone = target >= 90 ? "good" : target >= 35 ? "info" : target >= 15 ? "warn" : "crit";
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${target}%${label ? ` ${label}` : ""}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="9" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          opacity={value > 0 ? 1 : 0}
          className={`ring-fill tone-${tone}`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <strong>{value}%</strong>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ---- toasts ---- */

type Toast = { id: number; text: string; tone: string };
let toastId = 0;
const toastListeners = new Set<(t: Toast[]) => void>();
let toasts: Toast[] = [];

export function toast(text: string, tone: "good" | "info" | "warn" | "crit" = "info") {
  const t = { id: ++toastId, text, tone };
  toasts = [...toasts, t].slice(-4);
  toastListeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l(toasts));
  }, 4200);
}

export function Toaster() {
  const [list, setList] = useState<Toast[]>(toasts);
  useEffect(() => {
    toastListeners.add(setList);
    return () => {
      toastListeners.delete(setList);
    };
  }, []);
  return (
    <div className="toaster" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Re-render every `ms` so relative timestamps stay fresh. */
export function useTick(ms = 15_000) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

const CONFETTI_COLORS = ["#7c3aed", "#a78bfa", "#16a34a", "#fbbf24", "#e0611a", "#2563eb"];

/** One-shot celebratory burst, drawn on a canvas overlay. */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = (c.width = c.offsetWidth * dpr);
    const h = (c.height = c.offsetHeight * dpr);
    const parts = Array.from({ length: 140 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 16 * dpr,
      vy: (-Math.random() * 14 - 6) * dpr,
      s: (4 + Math.random() * 6) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      col: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));
    let raf = 0;
    const start = performance.now();
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const life = (t - start) / 2600;
      for (const p of parts) {
        p.vy += 0.45 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (life < 1) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
