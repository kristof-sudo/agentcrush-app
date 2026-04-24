import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const ENV_PATHS = [
  path.join(repoRoot, ".env.local"),
  path.join(repoRoot, ".env"),
  path.join(__dirname, ".env"),
];

const TABLES = [
  "ajsa_sources",
  "ajsa_brief_items",
  "ajsa_weekly_reviews",
  "ajsa_catalyst_state",
  "ajsa_feedback",
];

function parseEnv(text) {
  const out = {};

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

async function loadEnvFiles() {
  const loaded = [];

  for (const envPath of ENV_PATHS) {
    try {
      const text = await fs.readFile(envPath, "utf8");
      const parsed = parseEnv(text);

      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) process.env[key] = value;
      }

      loaded.push(path.relative(repoRoot, envPath) || envPath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.warn(`Warning: could not read ${path.relative(repoRoot, envPath)}: ${err.message}`);
      }
    }
  }

  return loaded;
}

function assertDryRunOnly() {
  const args = process.argv.slice(2);
  const refusedFlags = ["--live", "--send", "--no-dry-run", "--write", "--telegram"];
  const requestedLiveMode = args.find((arg) => refusedFlags.includes(arg));

  if (requestedLiveMode) {
    throw new Error(`Refusing ${requestedLiveMode}: Ajsa repo worker supports dry-run only.`);
  }

  const unknown = args.find((arg) => arg !== "--dry-run");
  if (unknown) {
    throw new Error(`Unknown argument ${unknown}. Only --dry-run is supported.`);
  }
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function requireEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return { url, key };
}

async function countTable(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) return { table, count: null, error };
  return { table, count: count ?? 0, error: null };
}

async function fetchActiveSources(supabase) {
  return supabase
    .from("ajsa_sources")
    .select("source_key, source_type, status, display_name, url")
    .eq("status", "active")
    .order("source_type", { ascending: true })
    .order("source_key", { ascending: true });
}

async function fetchTodayBriefItems(supabase, briefDate) {
  return supabase
    .from("ajsa_brief_items")
    .select("id, source_key, title, url, recommendation, priority, score, status")
    .eq("brief_date", briefDate)
    .in("status", ["candidate", "selected"])
    .order("priority", { ascending: false, nullsFirst: false })
    .order("score", { ascending: false, nullsFirst: false })
    .limit(12);
}

async function fetchCatalysts(supabase) {
  return supabase
    .from("ajsa_catalyst_state")
    .select("catalyst_key, status, title, source_key, last_seen_at, last_triggered_at")
    .order("status", { ascending: true })
    .order("catalyst_key", { ascending: true });
}

function printRows(label, rows, renderRow) {
  console.log(`\n${label}`);

  if (!rows?.length) {
    console.log("  - none");
    return;
  }

  for (const row of rows) {
    console.log(`  - ${renderRow(row)}`);
  }
}

async function main() {
  assertDryRunOnly();
  const loadedEnv = await loadEnvFiles();
  const { url, key } = requireEnv();

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const briefDate = todayUTC();
  const [tableCounts, activeSourcesResult, briefItemsResult, catalystsResult] = await Promise.all([
    Promise.all(TABLES.map((table) => countTable(supabase, table))),
    fetchActiveSources(supabase),
    fetchTodayBriefItems(supabase, briefDate),
    fetchCatalysts(supabase),
  ]);

  console.log("Ajsa Daily Brief — DRY RUN");
  console.log(`Date: ${briefDate}`);
  console.log(`Env files loaded: ${loadedEnv.length ? loadedEnv.join(", ") : "none"}`);
  console.log("Mode: read-only; Telegram disabled; Supabase writes disabled");

  console.log("\nTable counts");
  for (const result of tableCounts) {
    if (result.error) {
      console.log(`  - ${result.table}: error (${result.error.message})`);
    } else {
      console.log(`  - ${result.table}: ${result.count}`);
      if (result.count === 0) console.warn(`Warning: ${result.table} is empty.`);
    }
  }

  if (activeSourcesResult.error) throw activeSourcesResult.error;
  if (briefItemsResult.error) throw briefItemsResult.error;
  if (catalystsResult.error) throw catalystsResult.error;

  printRows(
    "Active sources",
    activeSourcesResult.data,
    (source) => `${source.source_key} [${source.source_type}] ${source.display_name}`
  );

  printRows(
    "Today's candidate/selected brief items",
    briefItemsResult.data,
    (item) => `${item.status}: ${item.title} (${item.source_key})`
  );

  if (!briefItemsResult.data?.length) {
    console.warn("Warning: no candidate or selected brief items for today's dry-run preview.");
  }

  printRows(
    "Catalyst state",
    catalystsResult.data,
    (catalyst) => `${catalyst.catalyst_key} [${catalyst.status}] ${catalyst.title}`
  );

  console.log("\nTelegram-ready preview");
  console.log("Ajsa Daily Brief — DRY RUN");
  console.log(`Sources active: ${activeSourcesResult.data?.length ?? 0}`);
  console.log(`Brief candidates today: ${briefItemsResult.data?.length ?? 0}`);
  console.log(`Catalysts tracked: ${catalystsResult.data?.length ?? 0}`);
  console.log("No Telegram message was sent.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
