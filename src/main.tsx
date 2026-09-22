import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "./router";
import { AppRoutes } from "./ui/AppRoutes";
import { Toaster } from "./ui/primitives";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <div className="app-root">
        <AppRoutes />
      </div>
      <Toaster />
    </HashRouter>
  </StrictMode>,
);
