import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { changePassword, login } from "../domain/services/auth.service";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { token, user } = await login(email, password);

    res.cookie(env.cookieName, token, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
    });
    res.json({ token, user });
  }),
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(env.cookieName);
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
