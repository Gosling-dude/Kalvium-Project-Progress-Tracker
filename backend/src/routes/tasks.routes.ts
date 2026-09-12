import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { listMyTasks } from "../domain/services/task.service";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    res.json({ data: await listMyTasks(req.user!.id, req.user!.role) });
  }),
);
