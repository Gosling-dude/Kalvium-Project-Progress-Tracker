import { useTheme } from "../../lib/theme";
import { Icon } from "./Icon";

/** Sun/moon switch that flips the whole app between light and dark mode. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
        isDark ? "bg-slate-700" : "bg-slate-200"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition-transform duration-200 ease-spring dark:bg-slate-900 dark:text-slate-300 ${
          isDark ? "translate-x-[1.625rem]" : "translate-x-1"
        }`}
      >
        <Icon name={isDark ? "moon" : "sun"} size={13} />
      </span>
    </button>
  );
}
