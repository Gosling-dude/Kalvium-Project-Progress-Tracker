import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ROLE } from "../domain/constants/enums";
import { createAdminUser, listUsers, setUserActive } from "../domain/services/user.service";

export const userRouter = Router();
userRouter.use(requireAuth, requireRole("ADMIN"));

userRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const role = req.query.role as (typeof ROLE)[number] | undefined;
    const includeInactive = req.query.includeInactive === "true";
    res.json({ data: await listUsers(role, includeInactive) });
  }),
);

userRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await createAdminUser(input, req.user!.id) });
  }),
);

userRouter.post(
  "/:id/activate",
  asyncHandler(async (req, res) => {
    res.json({ data: await setUserActive(req.params.id, true, req.user!.id) });
  }),
);

userRouter.post(
  "/:id/deactivate",
  asyncHandler(async (req, res) => {
    res.json({ data: await setUserActive(req.params.id, false, req.user!.id) });
  }),
);
