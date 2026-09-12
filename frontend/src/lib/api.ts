import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
});

const TOKEN_KEY = "kalvium_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err) && err.response?.status === 401 && !err.config?.url?.includes("/auth/login")) {
      setToken(null);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
  };
}

// Zod validation failures (422 VALIDATION_ERROR) carry the real reason in
// `details.fieldErrors`/`formErrors` — the top-level `message` is just the
// generic "Request failed validation", so surface the field-level text
// instead whenever it's present.
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<ApiErrorShape>;
    const error = e.response?.data?.error;
    const fieldErrors = error?.details?.fieldErrors
      ? Object.entries(error.details.fieldErrors)
          .filter(([, messages]) => messages?.length)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
      : [];
    const formErrors = error?.details?.formErrors ?? [];
    const detail = [...fieldErrors, ...formErrors].join("; ");
    return detail ? `${error!.message} — ${detail}` : (error?.message ?? e.message);
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}
