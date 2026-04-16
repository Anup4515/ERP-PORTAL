import mysql, { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var _dbPool: Pool | undefined;
}

function getDbPool(): Pool {
  if (!globalThis._dbPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    globalThis._dbPool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 50,
    });
  }
  return globalThis._dbPool;
}

export async function executeQuery<T = RowDataPacket[]>(
  sql: string,
  params?: (string | number | boolean | null | Buffer)[]
): Promise<T> {
  const pool = getDbPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

export async function executeTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getDbPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
