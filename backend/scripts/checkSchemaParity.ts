// Guards against prisma/schema.prisma (SQLite, dev/test) and
// prisma/postgres/schema.prisma (Postgres, production) silently drifting.
// Prisma's datasource `provider` must be a literal string, so it can't be
// switched per-environment inside one schema file — hence the two files (in
// separate directories, each with its own adjacent `migrations/`, since
// Prisma always resolves migrations relative to the schema file's own
// directory) — but everything below the `datasource` block (every model,
// enum-like field, index) must stay identical between them. Run via
// `npm run check:schema-parity`; exits non-zero on any difference.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..", "prisma");
const DEV_SCHEMA = path.join(ROOT, "schema.prisma");
const PROD_SCHEMA = path.join(ROOT, "postgres", "schema.prisma");

// Strips the file's leading comment block, generator block, and datasource
// block — the only parts these two files are allowed to differ on — leaving
// just the models/enums to compare.
function modelsOnly(source: string): string {
  return source
    .replace(/datasource\s+db\s*\{[^}]*\}/s, "")
    .replace(/generator\s+client\s*\{[^}]*\}/s, "")
    .replace(/^\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

const devSource = fs.readFileSync(DEV_SCHEMA, "utf-8");
const prodSource = fs.readFileSync(PROD_SCHEMA, "utf-8");

const devModels = modelsOnly(devSource);
const prodModels = modelsOnly(prodSource);

if (devModels !== prodModels) {
  console.error(
    "schema.prisma and prisma/postgres/schema.prisma have drifted — every model/enum must be identical between them (only the datasource block may differ).\n" +
      "Edit whichever one you changed and mirror the change in the other, then re-run this check.\n" +
      "If you added a migration, remember to also add the matching one under prisma/postgres/migrations/ (see DEPLOYMENT.md).",
  );
  process.exit(1);
}

console.log("schema.prisma and prisma/postgres/schema.prisma match (datasource block aside).");
