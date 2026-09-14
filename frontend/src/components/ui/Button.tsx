import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { Icon, IconName } from "./Icon";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "subtle";
type Size = "xs" | "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  // Gradient + inner highlight gives the primary action real presence without
  // resorting to a heavier color; the ring keeps its edge crisp on white.
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-brand ring-1 ring-inset ring-brand-700/40 hover:from-brand-600 hover:to-brand-700 active:from-brand-700 active:to-brand-700 disabled:from-brand-300 disabled:to-brand-300 disabled:shadow-none disabled:ring-brand-300 dark:disabled:from-brand-900 dark:disabled:to-brand-900 dark:disabled:ring-brand-800",
  secondary:
    "bg-white text-slate-700 shadow-xs ring-1 ring-inset ring-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-400 active:bg-slate-100 disabled:bg-white disabled:text-slate-400 disabled:shadow-none disabled:ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700 dark:hover:text-white dark:hover:ring-slate-500 dark:active:bg-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 dark:disabled:ring-slate-700",
  danger:
    "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-sm ring-1 ring-inset ring-rose-700/40 hover:from-rose-600 hover:to-rose-700 active:from-rose-700 active:to-rose-700 disabled:from-rose-300 disabled:to-rose-300 disabled:shadow-none disabled:ring-rose-300 dark:disabled:from-rose-900 dark:disabled:to-rose-900 dark:disabled:ring-rose-800",
  ghost:
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:active:bg-slate-700 dark:disabled:text-slate-600",
  subtle:
    "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 hover:bg-brand-100 hover:ring-brand-200 active:bg-brand-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:ring-slate-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30 dark:hover:bg-brand-500/20 dark:hover:ring-brand-500/40 dark:active:bg-brand-500/25 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 dark:disabled:ring-slate-700",
};

const SIZE_CLASSES: Record<Size, string> = {
  xs: "h-7 gap-1 rounded-md px-2 text-xs",
  sm: "h-8 gap-1.5 rounded-md px-2.5 text-sm",
  md: "h-9 gap-1.5 rounded-md px-3.5 text-sm",
  lg: "h-11 gap-2 rounded-lg px-5 text-base",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks interaction without changing the button's width. */
  loading?: boolean;
  /** Convenience leading icon; `iconRight` places one after the label instead. */
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", loading = false, icon, iconRight, disabled, children, ...props },
  ref,
) {
  const iconSize = size === "lg" ? 17 : size === "xs" ? 13 : 15;
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`group relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,box-shadow,color,transform,opacity] duration-150 ease-smooth active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {!loading && icon && <Icon name={icon} size={iconSize} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
});
