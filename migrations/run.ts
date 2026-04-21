/**
 * Node.js Migration Runner for WiserWits Partners Portal
 *
 * Uses the same mysql2 driver as the app — no external CLI dependency.
 *
 * Usage:
 *   npx tsx migrations/run.ts up        # Apply pending migrations
 *   npx tsx migrations/run.ts status    # Show migration status
 *   npx tsx migrations/run.ts create <name>  # Scaffold a new migration file
 *
 * Reads DB config from .env.local (same as the app).
 */

import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

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
async function getConnection() {
  if (process.env.DATABASE_URL) {
    return mysql.createConnection({
      uri: process.env.DATABASE_URL,
      charset: "utf8mb4",
      multipleStatements: true,
    });
  }
  return mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "dev_db",
    charset: "utf8mb4",
    multipleStatements: true, // migrations can contain multiple statements
  });
}

function describeConnection(): string {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return `${url.pathname.slice(1)} @ ${url.hostname}:${url.port || 3306}`;
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

async function ensureMigrationsTable(conn: mysql.Connection) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      version VARCHAR(20) NOT NULL,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_version (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getAppliedVersions(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.execute("SELECT version FROM schema_migrations ORDER BY version");
  return new Set((rows as any[]).map((r) => r.version));
}

// ── Commands ─────────────────────────────────────────────────────────

async function up() {
  const conn = await getConnection();
  try {
    await ensureMigrationsTable(conn);
    const applied = await getAppliedVersions(conn);
    const files = getMigrationFiles();
    let count = 0;

    console.log(`\n  Migrating ${describeConnection()}\n`);

    for (const { version, name, file } of files) {
      if (applied.has(version)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      process.stdout.write(`  ${file} ... `);

      try {
        await conn.query(sql);
        // If the migration doesn't self-register, register it
        const [check] = await conn.execute(
          "SELECT 1 FROM schema_migrations WHERE version = ?",
          [version]
        );
        if ((check as any[]).length === 0) {
          await conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
            [version, name]
          );
        }
        console.log("done");
        count++;
      } catch (err: any) {
        console.log("FAILED");
        console.error(`\n  Error: ${err.message}\n`);
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
    await conn.end();
  }
}

async function status() {
  const conn = await getConnection();
  try {
    await ensureMigrationsTable(conn);
    const applied = await getAppliedVersions(conn);
    const files = getMigrationFiles();

    console.log(`\n  Migration status for ${describeConnection()}\n`);
    console.log(`  ${"VERSION".padEnd(10)} ${"NAME".padEnd(40)} STATUS`);
    console.log(`  ${"-------".padEnd(10)} ${"----".padEnd(40)} ------`);

    for (const { version, name } of files) {
      const status = applied.has(version) ? "applied" : "PENDING";
      console.log(`  ${version.padEnd(10)} ${name.padEnd(40)} ${status}`);
    }
    console.log();
  } finally {
    await conn.end();
  }
}

function create(migrationName: string) {
  if (!migrationName) {
    console.error("\n  Usage: npx tsx migrations/run.ts create <name>\n");
    console.error("  Example: npx tsx migrations/run.ts create add_partner_id_to_students\n");
    process.exit(1);
  }

  // Sanitize name
  const safeName = migrationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  // Find next version number
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

-- Write your SQL here. Each statement must end with a semicolon.
-- The migration runner supports multiple statements per file.

-- Example:
-- ALTER TABLE students ADD COLUMN partner_id BIGINT UNSIGNED AFTER id;
-- CREATE INDEX idx_students_partner ON students (partner_id);

-- ============================================================================
-- Record this migration
-- ============================================================================
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('${nextVersion}', '${safeName}', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
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
