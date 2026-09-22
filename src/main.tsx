import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "./router";
import { AppRoutes } from "./ui/AppRoutes";
import { AboutDemo } from "./ui/AboutDemo";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { Toaster } from "./ui/primitives";
import "./styles.css";
import { applyTheme } from "./theme";

applyTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <div className="app-root">
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </div>
      <Toaster />
      <AboutDemo />
    </HashRouter>
  </StrictMode>,
);
