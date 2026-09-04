import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";

const app = createApp();

app.listen(env.port, () => {
  logger.info(`Kalvium Project Defence Tracker API listening on port ${env.port} (${env.nodeEnv})`);
});
