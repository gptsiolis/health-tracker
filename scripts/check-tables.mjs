import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing SUPABASE_DATABASE_URL environment variable.");
}

const expectedTables = [
  "exercise",
  "foods",
  "location",
  "sleep",
  "supplements",
  "symptoms",
];

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const result = await client.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1)
      order by table_name
    `,
    [expectedTables],
  );

  console.log(result.rows.map((row) => row.table_name).join("\n"));
} finally {
  await client.end();
}
