import mysql, { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var _dbPool: Pool | undefined;
}

function getDbPool(): Pool {
  if (!globalThis._dbPool) {
    globalThis._dbPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "dev_db",
      connectionLimit: 10,
      charset: "utf8mb4",
      timezone: "+00:00",
      waitForConnections: true,
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
