import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { changePassword, login } from "../domain/services/auth.service";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

// The frontend actually authenticates via the `token` in the JSON body (sent
// as an Authorization: Bearer header, stored in localStorage — see
// frontend/src/lib/api.ts), not this cookie. It's set anyway as a fallback
// auth path (see requireAuth) and must be a *cross-site* cookie in
// production, since the frontend (Vercel) and backend (Render) are on
// different origins — SameSite=Lax would silently never be sent.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: (env.nodeEnv === "production" ? "none" : "lax") as "none" | "lax",
} as const;

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { token, user } = await login(email, password);

    res.cookie(env.cookieName, token, { ...COOKIE_OPTIONS, maxAge: 12 * 60 * 60 * 1000 });
    res.json({ token, user });
  }),
);

authRouter.post("/logout", (_req, res) => {
  // clearCookie must be called with the same attributes the cookie was set
  // with (minus maxAge/expires) or some browsers won't recognize it as the
  // same cookie and silently no-op the clear.
  res.clearCookie(env.cookieName, COOKIE_OPTIONS);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) });

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await changePassword(req.user!.id, currentPassword, newPassword);
    res.status(204).send();
  }),
);
