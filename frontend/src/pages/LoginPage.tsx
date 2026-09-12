import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiErrorMessage } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";
import { ErrorBanner } from "../components/ui/Feedback";
import { Icon, IconName } from "../components/ui/Icon";

const HIGHLIGHTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "layers", title: "Track-aware progression", body: "Every student's route through A, A1, A2 and B, with full history." },
  { icon: "clipboard", title: "Evidence at every gate", body: "Reviews, video assessments, interviews and deliverables in one place." },
  { icon: "tasks", title: "Nothing slips", body: "Assigned flags, pending confirmations and upcoming interviews surface to you." },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel — desktop only, so the phone layout stays a focused form. */}
      <div className="relative hidden w-1/2 max-w-2xl flex-col justify-between overflow-hidden bg-brand-900 p-10 text-white lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(99,137,250,0.42),transparent_55%),radial-gradient(circle_at_85%_85%,rgba(52,87,213,0.5),transparent_50%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-base font-bold ring-1 ring-inset ring-white/25 backdrop-blur">
            K
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Kalvium</p>
            <p className="text-xs text-brand-200">Project Defence</p>
          </div>
        </div>

        <div className="relative animate-fade-in-up">
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Every student's journey,
            <br />
            <span className="text-brand-300">accounted for.</span>
          </h2>
          <ul className="mt-9 space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-200 ring-1 ring-inset ring-white/15">
                  <Icon name={h.icon} size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{h.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-brand-200/90">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200/70">Program progression console · Admin & Growth Coach access</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white shadow-brand">
              K
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">Kalvium Project Defence</p>
              <p className="text-xs text-slate-500">Progress Tracker</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to the Project Defence console.</p>

          <div className="mt-7 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && <ErrorBanner message={error} />}
              <Field label="Email" required>
                <Input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="you@kalvium.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Password" required>
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Button type="submit" size="lg" className="mt-1 w-full" loading={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            Trouble signing in? Contact your Program Admin.
          </p>
        </div>
      </div>
    </div>
  );
}
