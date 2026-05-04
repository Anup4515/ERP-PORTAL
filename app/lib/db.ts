import { Pool, PoolClient, QueryResult, types } from "pg"

// pg returns BIGINT (OID 20) as a string by default to avoid JS precision
// loss above 2^53. For this app's IDs that's overkill — nothing goes near
// that range — and it breaks every `switch (roleId) { case 4: ... }` and
// every numeric comparison that worked with mysql2's number-returning
// behaviour. Override the parser to match. DECIMAL/NUMERIC (1700) is left
// alone so fee amounts etc. keep their exact decimal precision as strings.
types.setTypeParser(20, (val: string) => parseInt(val, 10))

// pg returns BOOL (OID 16) as a JS true/false. Existing code (originally
// written against mysql2 + TINYINT(1)) compares boolean columns to 1/0 in
// dozens of places (is_current === 1, is_holiday === 1, etc.). Returning
// 1/0 here keeps all those checks working unchanged. The TypeScript
// interfaces typed these fields as `number` already, so the type story
// also stays consistent.
types.setTypeParser(16, (val: string) => (val === "t" ? 1 : 0))

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined
}

function getDbPool(): Pool {
  if (!globalThis._pgPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set")
    }
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      // TCP keepalive packets prevent cloud providers (Azure, RDS, GCP)
      // from silently killing idle connections after their internal
      // timeout. Without this, you periodically see ETIMEDOUT on the
      // first query after a quiet period.
      keepAlive: true,
      // If a connection sits unused this long, drop it from the pool.
      // Azure Postgres kills idle conns after ~5 min by default; staying
      // well under that means we never hand a stale conn to a query.
      idleTimeoutMillis: 30_000,
      // Bound how long a fresh connection attempt is allowed to take.
      connectionTimeoutMillis: 10_000,
    })
    // Pg emits 'error' on idle clients when their socket dies (e.g. server
    // disconnected, network hiccup). Without a handler this crashes the
    // Node process. Log it; the pool itself will replace the dead client
    // on the next checkout.
    pool.on("error", (err) => {
      console.error("Postgres pool — idle client error:", err.message)
    })
    globalThis._pgPool = pool
  }
  return globalThis._pgPool
}

/**
 * Convert mysql2-style `?` placeholders to pg-style `$1, $2, …`.
 *
 * String literals (`'…'`, including doubled-quote escapes) and comments
 * (`--` line comments and `/* … *\/` blocks) are skipped so a literal `?`
 * inside them is preserved verbatim. This lets every existing call site
 * continue to use `?` without rewriting hundreds of SQL strings — the cost
 * is one cheap pass per query.
 */
function rewritePlaceholders(sql: string): string {
  let out = ""
  let i = 0
  let next = 1
  let inSingle = false
  let inDouble = false
  let inLineComment = false
  let inBlockComment = false

  while (i < sql.length) {
    const c = sql[i]
    const c2 = sql[i + 1]

    if (inLineComment) {
      out += c
      if (c === "\n") inLineComment = false
      i++
      continue
    }
    if (inBlockComment) {
      out += c
      if (c === "*" && c2 === "/") {
        out += "/"
        i += 2
        inBlockComment = false
        continue
      }
      i++
      continue
    }
    if (inSingle) {
      out += c
      // Handle '' as an escaped quote inside a string.
      if (c === "'" && c2 === "'") {
        out += c2
        i += 2
        continue
      }
      if (c === "'") inSingle = false
      i++
      continue
    }
    if (inDouble) {
      out += c
      if (c === '"') inDouble = false
      i++
      continue
    }

    if (c === "'") { out += c; inSingle = true; i++; continue }
    if (c === '"') { out += c; inDouble = true; i++; continue }
    if (c === "-" && c2 === "-") { out += c; inLineComment = true; i++; continue }
    if (c === "/" && c2 === "*") { out += c; inBlockComment = true; i++; continue }
    if (c === "?") { out += "$" + next; next += 1; i++; continue }

    out += c
    i++
  }
  return out
}

type AnyParam = string | number | boolean | null | Buffer | Date

/**
 * Execute a SELECT/UPDATE/DELETE/INSERT and return the rows array.
 *
 * INSERTs that need to read back an id must append `RETURNING id` (or
 * `RETURNING *`) — pg has no `insertId` concept.
 */
export async function executeQuery<T = unknown>(
  sql: string,
  params?: AnyParam[]
): Promise<T> {
  const pool = getDbPool()
  const text = rewritePlaceholders(sql)
  const result = await pool.query(text, params as unknown[] | undefined)
  return result.rows as unknown as T
}

/**
 * mysql2-shaped wrapper around a pg client so existing call sites that do
 * `const [rows] = await connection.execute(sql, params)` keep working
 * unchanged. The first tuple element is the rows array; the second is a
 * stand-in for mysql2's `fields` (we don't surface it).
 *
 * For INSERTs that need an id back, callers must add `RETURNING id` and read
 * `rows[0].id`. The legacy `(result as any).insertId` path no longer works
 * and must be migrated per call site.
 */
export interface PgPoolConnection {
  execute<R = unknown>(
    sql: string,
    params?: AnyParam[]
  ): Promise<[R, undefined]>
}

function wrapClient(client: PoolClient): PgPoolConnection {
  return {
    execute: async <R>(sql: string, params?: AnyParam[]) => {
      const text = rewritePlaceholders(sql)
      const result: QueryResult = await client.query(text, params as unknown[] | undefined)
      return [result.rows as unknown as R, undefined]
    },
  }
}

export async function executeTransaction<T>(
  callback: (connection: PgPoolConnection) => Promise<T>
): Promise<T> {
  const pool = getDbPool()
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await callback(wrapClient(client))
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    throw error
  } finally {
    client.release()
  }
}
