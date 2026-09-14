import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`Kalvium Project Defence Tracker API listening on port ${env.port} (${env.nodeEnv})`);
});

// Render (and most PaaS hosts/orchestrators) send SIGTERM before killing the
// process on every deploy or restart — without handling it, in-flight
// requests get cut off mid-response and the DB pool is never closed cleanly.
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if connections haven't drained in time, rather than hanging.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
