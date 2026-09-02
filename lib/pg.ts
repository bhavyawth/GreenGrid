import { Pool } from 'pg';

const connectionString = process.env.DB_URI;

if (!connectionString) {
  console.warn('WARNING: DB_URI environment variable is not defined. PostgreSQL will fail to connect.');
}

const globalAny = globalThis as any;

if (!globalAny.pgPool && connectionString) {
  globalAny.pgPool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

export const pool: Pool = globalAny.pgPool;

export async function query(text: string, params?: any[]) {
  if (!pool) {
    throw new Error('PostgreSQL Pool is not initialized. Please verify DB_URI is configured.');
  }
  return pool.query(text, params);
}
