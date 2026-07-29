/**
 * Applies every file in supabase/migrations in filename order.
 *
 *   node scripts/run-migrations.mjs          # apply pending migrations
 *   node scripts/run-migrations.mjs --dry    # list what would run
 *
 * Needs SUPABASE_DB_URL in .env (Dashboard → Project Settings → Database →
 * Connection string → URI). Local use only; the app never reads it.
 *
 * Each file runs inside a transaction and is recorded in the
 * schema_migrations table, so re-running only applies what's missing.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry");

const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const connectionString = env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "SUPABASE_DB_URL is empty in .env.\n" +
      "Supabase Dashboard → Project Settings → Database → Connection string → URI"
  );
  process.exit(1);
}

const dir = join(root, "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await client.query("SELECT name FROM public.schema_migrations");
  const applied = new Set(rows.map((r) => r.name));
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log(`Nothing to do — all ${files.length} migrations already applied.`);
    return;
  }

  console.log(`${pending.length} pending migration(s):`);
  pending.forEach((f) => console.log(`  • ${f}`));
  if (dryRun) return;
  console.log("");

  for (const file of pending) {
    const sql = readFileSync(join(dir, file), "utf8");
    process.stdout.write(`→ ${file} … `);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO public.schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log("ok");
    } catch (e) {
      await client.query("ROLLBACK");
      console.log("FAILED");
      console.error(`\n${file} failed and was rolled back:\n  ${e.message}`);
      if (e.hint) console.error(`  hint: ${e.hint}`);
      process.exit(1);
    }
  }

  console.log("\nAll migrations applied.");
}

main()
  .catch((e) => {
    // never surface the connection string (it contains the password)
    console.error(e.message.replace(/postgres(ql)?:\/\/[^\s]+/g, "<connection-string>"));
    process.exit(1);
  })
  .finally(() => client.end());
