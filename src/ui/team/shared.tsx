import { useState } from "react";
import { MODULE_MAP } from "../../content/modules";
import { relTime, summarizeStaff } from "../../logic/metrics";
import { actions, greetingName, KIND_LABEL, useAppState } from "../../store";
import type { ActivityEvent, EventType, NoteKind, Staff } from "../../types";
import { Icon, type IconName } from "../icons";
import { Avatar, Modal, toast, useTick } from "../primitives";
import { useNav } from "../../router";

const EVENT_META: Record<EventType, [IconName, string]> = {
  started: ["play", "info"],
  stage: ["arrow", "mute"],
  quiz: ["book", "info"],
  sim_error: ["x", "warn"],
  passed: ["check", "good"],
  failed: ["flag", "crit"],
  reminder: ["send", "accent"],
  reminder_read: ["eye", "accent"],
  note: ["note", "mute"],
  staff_added: ["plus", "mute"],
  assigned: ["target", "accent"],
  recert: ["refresh", "warn"],
  login: ["users", "mute"],
};

export function Feed({ events, limit = 30, showClinic }: { events: ActivityEvent[]; limit?: number; showClinic?: boolean }) {
  useTick(5000);
  const state = useAppState();
  const { go } = useNav();
  const now = Date.now();
  if (!events.length) return <p className="fine">No activity yet.</p>;
  return (
    <ol className="feed">
      {events.slice(0, limit).map((e) => {
        const [icon, tone] = EVENT_META[e.type];
        const fresh = now - e.ts < 8000;
        const clinic = showClinic ? state.clinics.find((c) => c.id === e.clinicId) : undefined;
        return (
          <li
            key={e.id}
            className={`feed-item ${fresh ? "is-fresh" : ""} ${e.staffId ? "is-link" : ""}`}
            onClick={() => e.staffId && state.staff.some((s) => s.id === e.staffId) && go(`/team/clinic/${e.clinicId}/staff/${e.staffId}`)}
          >
            <span className={`feed-icon tone-bg-${tone}`}>
              <Icon name={icon} size={13} />
            </span>
            <span className="feed-text">
              {e.text}
              {clinic && <span className="fine"> · {clinic.name}</span>}
            </span>
            <time className="fine">{relTime(e.ts, now)}</time>
          </li>
        );
      })}
    </ol>
  );
}

export const TEMPLATES: { id: string; label: string; text: (s: Staff, moduleTitle?: string, days?: number) => string }[] = [
  {
    id: "next",
    label: "Next module nudge",
    text: (_s, m) => `Hi {name}! Your next Lupa module is “${m ?? "ready"}”. It takes about 10 minutes. Could you fit it in today?`,
  },
  {
    id: "start",
    label: "Get started",
    text: () => `Hi {name}, welcome to Lupa Academy! Your first module (Lupa Fundamentals & Jerry) takes ~8 minutes. Start whenever you have a gap between appointments.`,
  },
  {
    id: "retake",
    label: "Retake needed",
    text: (_s, m) => `Hi {name}, nearly there on “${m ?? "your module"}”. Review the flagged steps and retake when you're ready. Happy to jump on a quick 1:1 if helpful.`,
  },
  {
    id: "golive",
    label: "Go-live countdown",
    text: (_s, _m, d) => `Hi {name}, go-live is in ${d ?? "a few"} days! Please finish your remaining Lupa modules so you're confident on day one.`,
  },
  { id: "custom", label: "Custom message", text: () => "" },
];

export function ReminderModal({ staffIds, onClose }: { staffIds: string[]; onClose: () => void }) {
  const state = useAppState();
  const people = staffIds.map((id) => state.staff.find((s) => s.id === id)!).filter(Boolean);
  const first = people[0];
  const sum = first ? summarizeStaff(state, first) : undefined;
  const clinic = first ? state.clinics.find((c) => c.id === first.clinicId) : undefined;
  const days = clinic ? Math.max(0, Math.ceil((clinic.goLiveDate - Date.now()) / 86_400_000)) : undefined;
  const defaultTpl = sum && sum.certified === 0 && sum.modules.every((m) => m.attempts === 0) ? "start" : sum?.modules.some((m) => m.proficiency === "retrain") ? "retake" : "next";
  const [tpl, setTpl] = useState(defaultTpl);
  const modTitle = sum?.nextModule ? MODULE_MAP[sum.nextModule].title : undefined;
  const [text, setText] = useState(TEMPLATES.find((t) => t.id === defaultTpl)!.text(first, modTitle, days));

  function pick(id: string) {
    setTpl(id);
    const t = TEMPLATES.find((x) => x.id === id)!;
    setText(t.text(first, modTitle, days));
  }

  function send() {
    const moduleId = people.length === 1 ? sum?.nextModule : undefined;
    actions.sendReminder(staffIds, text, moduleId);
    toast(`Reminder sent to ${people.length === 1 ? people[0].name : `${people.length} people`}`, "good");
    onClose();
  }

  return (
    <Modal title="Send a reminder" onClose={onClose}>
      <div className="form">
        <div className="recipients">
          {people.slice(0, 8).map((p) => (
            <span key={p.id} className="chip">
              <Avatar name={p.name} size={20} /> {p.name}
            </span>
          ))}
          {people.length > 8 && <span className="chip">+{people.length - 8} more</span>}
        </div>
        <label className="field">
          <span>Template</span>
          <select id="reminder-template" value={tpl} onChange={(e) => pick(e.target.value)}>
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Message</span>
          <textarea id="reminder-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <p className="fine">
          {"{name}"} becomes each person's name ({first ? greetingName(first.name) : "…"}). Delivered in-app on their Lupa Academy home, and
          by email in production. You'll see when it's read.
        </p>
        <div className="form-actions">
          <button className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!text.trim()} onClick={send}>
            <Icon name="send" size={15} /> Send reminder
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function NoteModal({ clinicId, staffId, onClose }: { clinicId: string; staffId?: string; onClose: () => void }) {
  const [kind, setKind] = useState<NoteKind>("call");
  const [text, setText] = useState("");
  return (
    <Modal title="Log a touchpoint" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          actions.addNote(clinicId, kind, text.trim(), staffId);
          toast("Touchpoint logged", "good");
          onClose();
        }}
      >
        <div className="seg" role="radiogroup" aria-label="Type">
          {(Object.keys(KIND_LABEL) as NoteKind[]).map((k) => (
            <button type="button" key={k} className={k === kind ? "is-on" : ""} aria-checked={k === kind} role="radio" onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <label className="field">
          <span>What happened / what's next</span>
          <textarea
            id="note-text"
            rows={4}
            value={text}
            placeholder="e.g. On-site session with front desk. Jess still unsure about payment links; follow up Thursday."
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!text.trim()}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
