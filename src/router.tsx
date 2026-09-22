import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Tiny router. The top-level app follows `location.hash` (works on any static host);
 * Presenter mode mounts two independent in-memory routers side by side.
 */

interface Nav {
  path: string;
  go: (path: string) => void;
  /** True inside a presenter pane. */
  embedded: boolean;
}

const NavContext = createContext<Nav>({ path: "/", go: () => {}, embedded: false });

const readHash = () => {
  const h = window.location.hash.replace(/^#/, "");
  return h.startsWith("/") ? h : "/";
};

export function HashRouter({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(readHash);
  useEffect(() => {
    const on = () => {
      setPath(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((p: string) => {
    window.location.hash = p;
  }, []);
  return <NavContext.Provider value={{ path, go, embedded: false }}>{children}</NavContext.Provider>;
}

export function MemoryRouter({ initial, children }: { initial: string; children: ReactNode }) {
  const [path, setPath] = useState(initial);
  useEffect(() => setPath(initial), [initial]);
  return <NavContext.Provider value={{ path, go: setPath, embedded: true }}>{children}</NavContext.Provider>;
}

export function useNav() {
  return useContext(NavContext);
}

/** Match `/team/clinic/:cid` style patterns. Returns params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const a = path.split("?")[0].split("/").filter(Boolean);
  if (p.length !== a.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) out[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return out;
}

export function Link({ to, className, children, title }: { to: string; className?: string; children: ReactNode; title?: string }) {
  const { go, embedded } = useNav();
  return (
    <a
      href={embedded ? undefined : `#${to}`}
      role="link"
      tabIndex={0}
      className={className}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        go(to);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") go(to);
      }}
    >
      {children}
    </a>
  );
}
