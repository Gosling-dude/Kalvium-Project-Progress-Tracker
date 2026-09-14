import { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, InputHTMLAttributes } from "react";
import { Icon, IconName } from "./Icon";

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && (
          <span className="text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</span>}
      {error && (
        <span className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
          <Icon name="alert" size={12} className="mt-0.5" />
          {error}
        </span>
      )}
    </label>
  );
}

// One control surface shared by input/textarea/select so they line up pixel for
// pixel: same ring, same focus treatment, same disabled and invalid states.
const controlClass =
  "block w-full rounded-md border-0 bg-white text-sm text-slate-900 shadow-xs ring-1 ring-inset ring-slate-300 transition-shadow duration-150 placeholder:text-slate-400 hover:ring-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:ring-slate-200 aria-[invalid=true]:ring-rose-400 aria-[invalid=true]:focus:ring-rose-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:placeholder:text-slate-500 dark:hover:ring-slate-500 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500 dark:disabled:ring-slate-700";

const inputSizeClass = "h-9 px-3 py-1.5";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${inputSizeClass} ${className}`} />;
}

/** Input with a leading icon — used for search/filter bars. */
export function InputWithIcon({
  icon,
  className = "",
  wrapperClassName = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: IconName; wrapperClassName?: string }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <Icon
        name={icon}
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
      />
      <input {...props} className={`${controlClass} h-9 py-1.5 pl-9 pr-3 ${className}`} />
    </div>
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlClass} min-h-[4.5rem] resize-y px-3 py-2 leading-relaxed ${className}`} />;
}

// Deliberately NOT wrapped in a positioned div: callers pass layout classes
// (`w-auto`, `max-w-xs`) and drop <Select> straight into flex filter bars, so the
// <select> itself must stay the styled flex item. The chevron is a background
// image instead of an overlaid icon element.
const SELECT_CHEVRON =
  "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        backgroundImage: SELECT_CHEVRON,
        backgroundPosition: "right 0.5rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1rem 1rem",
        ...props.style,
      }}
      className={`${controlClass} h-9 cursor-pointer appearance-none py-1.5 pl-3 pr-8 ${className}`}
    >
      {children}
    </select>
  );
}

/** Checkbox styled to match the control surface, with its label as one target. */
export function Checkbox({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={`flex cursor-pointer select-none items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 ${className}`}>
      <input
        type="checkbox"
        {...props}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 shadow-xs transition-colors focus:ring-2 focus:ring-brand-500 focus:ring-offset-0 dark:border-slate-600 dark:bg-slate-800"
      />
      <span>{label}</span>
    </label>
  );
}
