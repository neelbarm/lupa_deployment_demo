import { applyTheme, useTheme, type ThemeChoice } from "../theme";
import { Icon, type IconName } from "./icons";

const OPTIONS: { value: ThemeChoice; icon: IconName; label: string }[] = [
  { value: "light", icon: "sun", label: "Light" },
  { value: "dark", icon: "moon", label: "Dark" },
  { value: "system", icon: "monitor", label: "Match system" },
];

export function ThemeToggle() {
  const theme = useTheme();
  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={theme === o.value}
          aria-label={o.label}
          title={o.label}
          className={theme === o.value ? "is-on" : ""}
          onClick={() => applyTheme(o.value)}
        >
          <Icon name={o.icon} size={15} />
        </button>
      ))}
    </div>
  );
}
