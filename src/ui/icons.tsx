const PATHS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  paw: "M12 13c-3 0-5 3.2-5 5a2 2 0 0 0 2.5 2c1-.3 1.7-.6 2.5-.6s1.5.3 2.5.6A2 2 0 0 0 17 18c0-1.8-2-5-5-5zM6 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  steth: "M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2M20 11a2 2 0 1 0 0 .01",
  chat: "M4 5h16v11H9l-5 4z",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  check: "M5 12.5 10 17l9-10",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  box: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M17 3.5a4 4 0 0 1 0 7.5M22 21c0-3-1.8-5.6-4.5-6.6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  send: "M3 11 21 3l-8 18-2-8z",
  note: "M5 3h10l4 4v14H5zM14 3v5h5M8 13h8M8 17h5",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 1 1 8 0v4",
  play: "M7 4v16l13-8z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 6l-6 6 6 6",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6 6 18",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  flag: "M5 21V4h11l-1.5 4L16 12H5",
  layout: "M3 4h18v16H3zM12 4v16",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  download: "M12 4v11M7 10l5 5 5-5M4 20h16",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  book: "M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z",
  swap: "M4 8h14l-4-4M20 16H6l4 4",
  hint: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.5 1 .5 1.6V16h6v-.5c0-.6 0-1.2.5-1.6A6 6 0 0 0 12 3z",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function LupaMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <circle cx="14" cy="14" r="6.5" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M19 19l5 5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
