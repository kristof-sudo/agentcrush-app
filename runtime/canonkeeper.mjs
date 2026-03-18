import { createClient } from "/opt/agentcrush/copydesk/node_modules/@supabase/supabase-js/dist/index.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function logRun(status, meta = {}, error = null) {
  // runs table exists from earlier work
  const { error: e } = await supabase.from("runs").insert([{
    runner: "canonkeeper",
    job: "tick",
    status,
    meta,
    error,
  }]);
  if (e) {
    // don't hard-fail if logging fails; print so we can see it
    console.error("runs insert failed:", e);
  }
}

async function main() {
  const { error } = await supabase.rpc("canonkeeper_tick");
  if (error) throw error;
  await logRun("ok", { ran_at: new Date().toISOString() });
  console.log("canonkeeper_tick OK");
}

main().catch(async (e) => {
  console.error("CANONKEEPER ERROR:", e);
  await logRun("error", { fatal: true }, String(e?.message || e));
  process.exit(1);
});
