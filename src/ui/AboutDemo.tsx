import { useState } from "react";
import { SPECIALIST } from "../data/seed";
import { Icon } from "./icons";
import { Modal } from "./primitives";

/**
 * Always-visible label making clear this is an independent concept demo,
 * not an official Lupa product, with a short explainer for unguided visitors.
 */
export function AboutDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="demo-badge" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Icon name="help" size={14} />
        Concept demo · not affiliated with Lupa
      </button>
      {open && (
        <Modal title="About this demo" onClose={() => setOpen(false)}>
          <div className="about">
            <p>
              An independent concept built by <strong>{SPECIALIST}</strong> for a Lupa Deployment Specialist interview. It is{" "}
              <strong>not an official Lupa product</strong> and is not affiliated with or endorsed by Lupa. Lupa's name and look are used only
              to show how this could fit its platform.
            </p>
            <ul>
              <li>Every clinic, person and score is fictional.</li>
              <li>Your data stays in this browser. Nothing is sent anywhere, and Reset restores the starting state.</li>
              <li>
                Numbers only change when someone trains, when you act in the console, or while <Icon name="bolt" size={13} /> Simulate
                activity is on. Rings and bars count up each time a page opens.
              </li>
            </ul>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => setOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
