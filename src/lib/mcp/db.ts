import 'server-only';

import { neon } from '@neondatabase/serverless';

export interface Database {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}

let database: Database | undefined;

export function getDatabase(): Database {
  if (database) return database;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');

  const sql = neon(connectionString);
  database = {
    query: <T extends Record<string, unknown>>(text: string, params: unknown[] = []) =>
      sql.query(text, params) as Promise<T[]>,
  };
  return database;
}
