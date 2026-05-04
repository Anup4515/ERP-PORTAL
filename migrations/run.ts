/**
 * Node.js Migration Runner for WiserWits Partners Portal (Postgres edition).
 *
 * Uses the same `pg` driver as the app — no external CLI dependency.
 *
 * Usage:
 *   npx tsx migrations/run.ts up                # Apply pending migrations
 *   npx tsx migrations/run.ts status            # Show migration status
 *   npx tsx migrations/run.ts create <name>     # Scaffold a new migration file
 *
 * Reads DB config from .env.local (same as the app).
 */

import fs from "fs";
import path from "path";
import { Client } from "pg";

// ── Load .env.local ──────────────────────────────────────────────────
const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const MIGRATIONS_DIR = __dirname;

// ── Helpers ──────────────────────────────────────────────────────────
async function getClient(): Promise<Client> {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      `postgres://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || ""}@${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "dev_db"}`,
  });
  await client.connect();
  return client;
}

function describeConnection(): string {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const u = new URL(url);
      return `${u.pathname.slice(1)} @ ${u.hostname}:${u.port || 5432}`;
    } catch {
      return "DATABASE_URL";
    }
  }
  return `${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT}`;
}

function getMigrationFiles(): { version: string; name: string; file: string }[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3,}_.*\.sql$/.test(f))
    .sort()
    .map((f) => {
      const match = f.match(/^(\d+)_(.+)\.sql$/);
      return { version: match![1], name: match![2], file: f };
    });
}

async function ensureMigrationsTable(client: Client) {
  // Postgres-flavoured. Single ENGINE=InnoDB-style trailer dropped; collation
  // is handled at the database level.
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      version     VARCHAR(20) NOT NULL UNIQUE,
      name        VARCHAR(255) NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedVersions(client: Client): Promise<Set<string>> {
  const result = await client.query<{ version: string }>(
    "SELECT version FROM schema_migrations ORDER BY version"
  );
  return new Set(result.rows.map((r) => r.version));
}

// ── Commands ─────────────────────────────────────────────────────────

async function up() {
  const client = await getClient();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedVersions(client);
    const files = getMigrationFiles();
    let count = 0;

    console.log(`\n  Migrating ${describeConnection()}\n`);

    for (const { version, name, file } of files) {
      if (applied.has(version)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      process.stdout.write(`  ${file} ... `);

      try {
        // Run each migration inside its own transaction so a failure leaves
        // the database untouched. pg's `client.query(text)` accepts
        // multi-statement strings natively when not parameterised.
        await client.query("BEGIN");
        await client.query(sql);

        const check = await client.query(
          "SELECT 1 FROM schema_migrations WHERE version = $1",
          [version]
        );
        if (check.rowCount === 0) {
          await client.query(
            "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
            [version, name]
          );
        }
        await client.query("COMMIT");
        console.log("done");
        count++;
      } catch (err: unknown) {
        await client.query("ROLLBACK").catch(() => {});
        const msg = err instanceof Error ? err.message : String(err);
        console.log("FAILED");
        console.error(`\n  Error: ${msg}\n`);
        console.error("  Fix the issue and re-run.\n");
        process.exit(1);
      }
    }

    if (count === 0) {
      console.log("  Everything up to date.\n");
    } else {
      console.log(`\n  Applied ${count} migration(s).\n`);
    }
  } finally {
    await client.end();
  }
}

async function status() {
  const client = await getClient();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedVersions(client);
    const files = getMigrationFiles();

    console.log(`\n  Migration status for ${describeConnection()}\n`);
    console.log(`  ${"VERSION".padEnd(10)} ${"NAME".padEnd(40)} STATUS`);
    console.log(`  ${"-------".padEnd(10)} ${"----".padEnd(40)} ------`);

    for (const { version, name } of files) {
      const s = applied.has(version) ? "applied" : "PENDING";
      console.log(`  ${version.padEnd(10)} ${name.padEnd(40)} ${s}`);
    }
    console.log();
  } finally {
    await client.end();
  }
}

function create(migrationName: string) {
  if (!migrationName) {
    console.error("\n  Usage: npx tsx migrations/run.ts create <name>\n");
    console.error("  Example: npx tsx migrations/run.ts create add_partner_id_to_students\n");
    process.exit(1);
  }

  const safeName = migrationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const files = getMigrationFiles();
  const lastVersion = files.length > 0 ? parseInt(files[files.length - 1].version, 10) : 0;
  const nextVersion = String(lastVersion + 1).padStart(3, "0");

  const fileName = `${nextVersion}_${safeName}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);

  const template = `-- ============================================================================
-- Migration: ${fileName}
-- Description: TODO: describe what this migration does
-- Created: ${new Date().toISOString().split("T")[0]}
-- ============================================================================

-- Write your Postgres SQL here. Each statement ends with a semicolon.
-- The runner wraps the file in a transaction.

-- Example:
-- ALTER TABLE students ADD COLUMN partner_id BIGINT;
-- CREATE INDEX idx_students_partner ON students (partner_id);

-- ============================================================================
-- Record this migration
-- ============================================================================
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('${nextVersion}', '${safeName}', NOW())
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
`;

  fs.writeFileSync(filePath, template);
  console.log(`\n  Created: migrations/${fileName}\n`);
  console.log("  Next steps:");
  console.log("    1. Edit the file and add your SQL");
  console.log("    2. Run: npm run migrate\n");
}

// ── Main ─────────────────────────────────────────────────────────────
const command = process.argv[2] || "up";

switch (command) {
  case "up":
    up();
    break;
  case "status":
    status();
    break;
  case "create":
    create(process.argv[3]);
    break;
  default:
    console.log(`
  Usage: npx tsx migrations/run.ts <command>

  Commands:
    up                   Apply all pending migrations (default)
    status               Show which migrations have been applied
    create <name>        Scaffold a new migration file
`);
}
