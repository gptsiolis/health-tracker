import { readFile } from "node:fs/promises";
import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.SUPABASE_DATABASE_URL;
const migrationPath = process.argv[2];

if (!databaseUrl) {
  throw new Error("Missing SUPABASE_DATABASE_URL environment variable.");
}

if (!migrationPath) {
  throw new Error("Usage: node scripts/run-migration.mjs <migration-file>");
}

const sql = await readFile(migrationPath, "utf8");
const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`Applied migration: ${migrationPath}`);
} finally {
  await client.end();
}
