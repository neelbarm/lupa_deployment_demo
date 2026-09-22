import { Component, type ReactNode } from "react";
import { actions } from "../store";

/** Keeps the live demo recoverable: if a screen throws, offer a reset instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page narrow">
        <div className="locked-card">
          <h2>Something went wrong in the demo</h2>
          <p>Resetting the demo data restores the starting clinics and staff.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              actions.resetDemo();
              window.location.hash = "/";
              this.setState({ failed: false });
            }}
          >
            Reset demo data
          </button>
        </div>
      </div>
    );
  }
}
