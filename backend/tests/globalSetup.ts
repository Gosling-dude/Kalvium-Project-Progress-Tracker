import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, "../.env.test"), override: true });

  const dbFile = path.resolve(__dirname, "../test.db");
  for (const suffix of ["", "-journal", "-shm", "-wal"]) {
    const file = dbFile + suffix;
    if (fs.existsSync(file)) fs.rmSync(file);
  }

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "inherit",
  });

  return async () => {
    for (const suffix of ["", "-journal", "-shm", "-wal"]) {
      const file = dbFile + suffix;
      if (fs.existsSync(file)) fs.rmSync(file);
    }
  };
}
