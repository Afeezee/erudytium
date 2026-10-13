import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const rawConnectionString = process.env.DATABASE_URL;
if (!rawConnectionString) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

// Strip sslmode from the URL so pg uses our explicit ssl config instead
// of pg-connection-string's new "require = verify-full" behavior.
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]channel_binding=[^&]*/g, "");

const here = dirname(fileURLToPath(import.meta.url));
const drizzle = join(here, "..", "drizzle");

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  console.log("Connecting...");
  await client.connect();
  console.log("Connected. Running 0000_init.sql");
  await client.query(readFileSync(join(drizzle, "0000_init.sql"), "utf8"));
  console.log("Init applied. Running 0001_seed_categories.sql");
  await client.query(readFileSync(join(drizzle, "0001_seed_categories.sql"), "utf8"));
  console.log("Seed applied.");
  const { rows } = await client.query("select tablename from pg_tables where schemaname='public' order by tablename");
  console.log("Tables:", rows.map((r) => r.tablename).join(", "));
  const { rows: cats } = await client.query("select count(*)::int as n from categories");
  console.log("Categories seeded:", cats[0].n);
} catch (err) {
  console.error("FAIL:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
