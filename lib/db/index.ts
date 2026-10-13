import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Schema = typeof schema;

const globalForDb = globalThis as unknown as {
  __erudytiumPool?: Pool;
  __erudytiumDb?: NodePgDatabase<Schema>;
};

const buildPool = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Point it at your Neon connection string (include ?sslmode=require).");
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    ssl: { rejectUnauthorized: false }
  });
};

export const getDb = (): NodePgDatabase<Schema> => {
  if (globalForDb.__erudytiumDb) {
    return globalForDb.__erudytiumDb;
  }
  const pool = globalForDb.__erudytiumPool ?? buildPool();
  const instance = drizzle(pool, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__erudytiumPool = pool;
    globalForDb.__erudytiumDb = instance;
  }
  return instance;
};

export const db: NodePgDatabase<Schema> = new Proxy({} as NodePgDatabase<Schema>, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  }
});

export type Database = NodePgDatabase<Schema>;
