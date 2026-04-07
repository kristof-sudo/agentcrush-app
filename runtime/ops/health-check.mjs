import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import fs from "node:fs";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_OPS_BOT_TOKEN,
  TELEGRAM_OPS_CHAT_ID,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const HEALTH_STATE_FILE = "/opt/agentcrush/state/health_check_state.json";
const SCANNER_LAST_RUN_FILE = "/opt/agentcrush/state/scanner_last_run.json";

// runner values MUST match what each worker passes to runs.runner in the DB.
// x_scanner does not log to the DB — it uses a local state file instead.
const WORKERS = [
  { runner: "x_scanner",         service: "x-scanner.service",         intervalSec: 3600,  lastRunFile: SCANNER_LAST_RUN_FILE },
  { runner: "x_selector",        service: "x-selector.service",        intervalSec: 1800  },
  { runner: "copydesk",          service: "copydesk.service",          intervalSec: 300   },
  { runner: "canon_enqueuer",    service: "canon-enqueuer.service",    intervalSec: 300   },
  { runner: "approval_notifier", service: "approval-notifier.service", intervalSec: 300   },
  { runner: "approval_listener", service: "approval-listener.service", intervalSec: 30    },
  { runner: "x_publisher",       service: "x-publisher.service",       intervalSec: 60    },
  { runner: "briefing_worker",   service: "briefing.service",          intervalSec: 14400 },
  { runner: "canonkeeper",       service: "canonkeeper.service",       intervalSec: 3600  },
];

// Workers that warrant alerts even during quiet hours.
const CRITICAL_RUNNERS = new Set(["x_publisher", "approval_listener"]);

// If a worker has been stale for longer than this, stop restarting and send one escalation alert.
const PERSISTENT_FAILURE_MS = 2 * 60 * 60 * 1000; // 2 hours

// Don't re-send a persistent-failure alert for the same worker within this window.
const PERSISTENT_ALERT_COOLDOWN_MS = 2 * 60 * 60 * 1000;

// Quiet hours: 23:00–07:00 UTC. Suppress routine heal messages.
const QUIET_START = 23;
const QUIET_END = 7;

// X API cost estimate — scanner doesn't log to DB, so use the state file run count.
const CALLS_PER_SCANNER_RUN = 5 + 47 + 1; // 5 search queries + 47 watchlist + 1 reply scan
const COST_PER_CALL_USD = 0.0033;
// Weekdays target $2-2.5/day, so alert earlier. Weekends allow up to $4.50.
const DAILY_COST_ALERT_THRESHOLD_WEEKDAY = 3.50;
const DAILY_COST_ALERT_THRESHOLD_WEEKEND = 4.00;

const MONTHLY_BUDGET_FILE = "/opt/agentcrush/state/monthly_budget.json";
const X_API_COST_FILE = "/opt/agentcrush/state/x_api_cost.json";

// Workers that go intentionally quiet when the X API daily cap is hit.
// Treat them as healthy (not stale) for the duration of the cap window.
const CAP_SENSITIVE_RUNNERS = new Set(["x_publisher", "x_scanner"]);

// ─── helpers ────────────────────────────────────────────────────────────────

function readJsonSafe(path, fallback) {
  try { return JSON.parse(fs.readFileSync(path, "utf8")); } catch { return fallback; }
}

function writeJsonSafe(path, data) {
  try { fs.writeFileSync(path, JSON.stringify(data, null, 2)); }
  catch (e) { console.error("state write failed:", path, e.message); }
}

function loadHealthState() {
  return readJsonSafe(HEALTH_STATE_FILE, { workers: {} });
}

function isQuietHours() {
  const h = new Date().getUTCHours();
  return h >= QUIET_START || h < QUIET_END;
}

function isWeekend() {
  const day = new Date().getUTCDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

function todayUTC() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function startOfDayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

async function sendOpsMessage(text) {
  if (!TELEGRAM_OPS_BOT_TOKEN || !TELEGRAM_OPS_CHAT_ID) return;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_OPS_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_OPS_CHAT_ID,
          text,
          disable_web_page_preview: true,
        }),
      }
    );
    const data = await res.json();
    if (!data.ok) console.error("Telegram send failed:", JSON.stringify(data));
  } catch (err) {
    console.error("Telegram error:", err.message);
  }
}

function restartService(service) {
  try {
    execSync(`systemctl restart ${service}`, { stdio: "pipe" });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.stderr?.toString().trim() || err.message };
  }
}

function isTimerActive(timerUnit) {
  try {
    return execSync(`systemctl is-active ${timerUnit}`, { stdio: "pipe" }).toString().trim() === "active";
  } catch {
    return false;
  }
}

function readXApiCapState() {
  const data = readJsonSafe(X_API_COST_FILE, null);
  if (!data || data.date !== todayUTC()) return { paused: false };
  return { paused: !!data.paused, estimatedUsd: data.estimated_usd ?? 0, callsToday: data.calls_today ?? 0 };
}

async function estimateDailyCost() {
  // Scanner doesn't log to DB — use the last_run state file and activity-level interval
  // to estimate runs today instead.
  const scannerState = readJsonSafe(SCANNER_LAST_RUN_FILE, null);
  if (!scannerState?.last_run) return null;

  const since = startOfDayUTC();
  const sinceMs = new Date(since).getTime();
  const lastRunMs = new Date(scannerState.last_run).getTime();

  // Estimate: assume 120-min average interval on weekdays (NORMAL weekday baseline), 90-min on weekends
  const avgIntervalMs = (isWeekend() ? 90 : 120) * 60 * 1000;
  const elapsedMs = Date.now() - sinceMs;
  const estimatedRunsToday = Math.max(1, Math.round(elapsedMs / avgIntervalMs));

  const callsToday = estimatedRunsToday * CALLS_PER_SCANNER_RUN;
  const costSoFar = callsToday * COST_PER_CALL_USD;
  const hourOfDay = new Date().getUTCHours();
  const projectedDailyCost = hourOfDay > 0 ? (costSoFar / hourOfDay) * 24 : costSoFar;

  return {
    scanner_last_run: scannerState.last_run,
    estimated_runs_today: estimatedRunsToday,
    estimated_cost_so_far: Number(costSoFar.toFixed(2)),
    projected_daily_cost: Number(projectedDailyCost.toFixed(2)),
    over_threshold: projectedDailyCost > (isWeekend() ? DAILY_COST_ALERT_THRESHOLD_WEEKEND : DAILY_COST_ALERT_THRESHOLD_WEEKDAY),
    threshold_used: isWeekend() ? DAILY_COST_ALERT_THRESHOLD_WEEKEND : DAILY_COST_ALERT_THRESHOLD_WEEKDAY,
  };
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const stamp = new Date().toISOString();
  const nowMs = Date.now();
  console.log(`health-check start ${stamp}`);

  // Fetch latest run per worker from DB in one query
  const { data: runs, error } = await supabase
    .from("runs")
    .select("runner, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const latest = {};
  for (const row of runs || []) {
    if (!latest[row.runner]) latest[row.runner] = row;
  }

  const costEstimate = await estimateDailyCost();
  if (costEstimate) {
    console.log(`cost estimate: ${JSON.stringify(costEstimate)}`);
  }

  const capState = readXApiCapState();
  if (capState.paused) {
    console.log(`x_api_cap: paused today (est $${capState.estimatedUsd?.toFixed(3)}, ${capState.callsToday} calls) — cap-sensitive workers treated as healthy`);
  }

  const state = loadHealthState();
  const healed = [];         // workers restarted this run (within 2h staleness window)
  const timerIssues = [];    // timers that were inactive and got started
  const escalated = [];      // workers exceeding 2h stale — need manual intervention

  for (const worker of WORKERS) {
    // ── resolve last run time ──────────────────────────────────────────────
    let lastRunMs;
    if (worker.lastRunFile) {
      const fileData = readJsonSafe(worker.lastRunFile, null);
      lastRunMs = fileData?.last_run
        ? nowMs - new Date(fileData.last_run).getTime()
        : Infinity;
    } else {
      const run = latest[worker.runner];
      lastRunMs = run?.created_at
        ? nowMs - new Date(run.created_at).getTime()
        : Infinity;
    }

    // ── timer check ───────────────────────────────────────────────────────
    const timerName = worker.service.replace(".service", ".timer");
    const timerOk = isTimerActive(timerName);

    if (!timerOk) {
      timerIssues.push(timerName);
      console.log(`timer inactive: ${timerName} — starting`);
      try { execSync(`systemctl start ${timerName}`, { stdio: "pipe" }); }
      catch (err) { console.error(`Failed to start ${timerName}:`, err.message); }
    }

    // ── staleness check ───────────────────────────────────────────────────
    const staleThresholdMs = worker.intervalSec * 2 * 1000;
    const isStale = lastRunMs > staleThresholdMs;

    // X API cap: publisher and scanner go intentionally quiet after cap is hit.
    // Classify as healthy for the rest of today — this is not a failure.
    if (isStale && capState.paused && CAP_SENSITIVE_RUNNERS.has(worker.runner)) {
      if (state.workers[worker.runner]) {
        console.log(`cap-paused: ${worker.runner} — clearing stale state (x_api_cap hit, intentional)`);
        delete state.workers[worker.runner];
      }
      console.log(`ok (cap-paused): ${worker.runner} — x_api_cap active, worker correctly idle`);
      continue;
    }

    if (!isStale) {
      // Worker healthy — clear any accumulated failure state
      if (state.workers[worker.runner]) {
        console.log(`recovered: ${worker.runner} — clearing failure state`);
        delete state.workers[worker.runner];
      }
      const agoSec = Math.round(lastRunMs / 1000);
      console.log(`ok: ${worker.runner} (${agoSec}s ago)`);
      continue;
    }

    // ── stale worker — check persistence ─────────────────────────────────
    const wState = state.workers[worker.runner] || {};
    if (!wState.first_stale_at) {
      wState.first_stale_at = new Date(nowMs).toISOString();
    }
    wState.consecutive_stale_count = (wState.consecutive_stale_count || 0) + 1;

    const staleForMs = nowMs - new Date(wState.first_stale_at).getTime();
    const isPersistent = staleForMs >= PERSISTENT_FAILURE_MS;

    if (isPersistent) {
      // Stop restarting — escalate instead. Rate-limit the alert per worker.
      const lastAlertMs = wState.persistent_alert_sent_at
        ? nowMs - new Date(wState.persistent_alert_sent_at).getTime()
        : Infinity;

      if (lastAlertMs >= PERSISTENT_ALERT_COOLDOWN_MS) {
        escalated.push({
          runner: worker.runner,
          staleForMin: Math.round(staleForMs / 60000),
          count: wState.consecutive_stale_count,
        });
        wState.persistent_alert_sent_at = new Date(nowMs).toISOString();
        console.log(`escalated: ${worker.runner} stale for ${Math.round(staleForMs / 60000)}min — needs manual check`);
      } else {
        console.log(`persistent (silent): ${worker.runner} stale for ${Math.round(staleForMs / 60000)}min, alert already sent`);
      }

      state.workers[worker.runner] = wState;
      continue; // do NOT restart persistently failing workers
    }

    // ── normal restart (within first 2h) ──────────────────────────────────
    const agoMin = lastRunMs === Infinity ? "never" : Math.round(lastRunMs / 60000) + "min ago";
    console.log(`stale: ${worker.runner} last=${agoMin} — restarting ${worker.service}`);

    const result = restartService(worker.service);
    if (result.ok) {
      console.log(`restarted: ${worker.service}`);
      healed.push({ runner: worker.runner, service: worker.service, lastRun: agoMin });
    } else {
      console.error(`restart failed: ${worker.service}: ${result.error}`);
      healed.push({ runner: worker.runner, service: worker.service, lastRun: agoMin, restartError: result.error });
    }

    state.workers[worker.runner] = wState;
  }

  writeJsonSafe(HEALTH_STATE_FILE, state);

  // ── DB log ────────────────────────────────────────────────────────────────
  await supabase.from("runs").insert([{
    runner: "health_check",
    job: "health_check",
    status: healed.length > 0 || escalated.length > 0 ? "healed" : "ok",
    meta: {
      healed_count: healed.length,
      escalated_count: escalated.length,
      timer_issues: timerIssues.length,
      healed,
      escalated,
      timer_issues_list: timerIssues,
      cost_estimate: costEstimate,
    },
  }]);

  // Check daily alert dedup: only send cost alert once per UTC day.
  const budgetState = readJsonSafe(MONTHLY_BUDGET_FILE, {});
  const costAlertAlreadySentToday = budgetState.daily_cost_alert_date === todayUTC();
  const costOverBudget = costEstimate?.over_threshold === true && !costAlertAlreadySentToday;

  // ── determine what warrants a Telegram message ───────────────────────────
  // Successful self-heals are silent — they're working as intended.
  // Only notify when manual intervention is needed.
  const restartFailures = healed.filter(h => h.restartError);
  const shouldNotify = escalated.length > 0 || restartFailures.length > 0 || costOverBudget;

  if (!shouldNotify) {
    const summary = [
      healed.length > 0 ? `${healed.length} healed` : null,
      timerIssues.length > 0 ? `${timerIssues.length} timer(s) fixed` : null,
      costEstimate ? `projected $${costEstimate.projected_daily_cost}/day` : null,
    ].filter(Boolean).join(", ");
    console.log(`health-check complete: ${summary || "all workers healthy"}`);
    return;
  }

  // ── build message ─────────────────────────────────────────────────────────
  const lines = ["🚨 AgentCrush Needs Attention"];
  lines.push(`Time: ${new Date().toUTCString()}`);

  if (restartFailures.length > 0) {
    lines.push(`\nRestart failures (${restartFailures.length}):`);
    for (const h of restartFailures) {
      lines.push(`  • ${h.runner} (last run: ${h.lastRun}) → FAILED: ${h.restartError}`);
    }
  }

  if (escalated.length > 0) {
    lines.push(`\n⚠️ Persistent failure — manual investigation needed (${escalated.length}):`);
    for (const e of escalated) {
      lines.push(`  • ${e.runner} — stale for ${e.staleForMin}min (${e.count} checks). Auto-restart stopped.`);
    }
  }

  if (costOverBudget && costEstimate) {
    // Throttle the scanner for the rest of today by overwriting daily_activity.json.
    // Raise scanner_interval_min to 180 min (3h) without changing the activity level caps.
    const ACTIVITY_FILE = "/opt/agentcrush/state/daily_activity.json";
    try {
      const existing = readJsonSafe(ACTIVITY_FILE, {});
      if (existing.scanner_interval_min !== 180) {
        writeJsonSafe(ACTIVITY_FILE, {
          ...existing,
          scanner_interval_min: 180,
          cost_throttled: true,
          cost_throttled_at: new Date().toISOString(),
        });
        console.log("cost throttle applied: scanner_interval_min set to 180min");
      }
    } catch (e) {
      console.error("cost throttle write failed:", e.message);
    }

    // Mark daily cost alert as sent so it doesn't fire again today.
    try {
      const bs = readJsonSafe(MONTHLY_BUDGET_FILE, {});
      writeJsonSafe(MONTHLY_BUDGET_FILE, { ...bs, daily_cost_alert_date: todayUTC() });
    } catch (e) {
      console.error("budget state write failed:", e.message);
    }

    lines.push(
      `\n💸 X API Cost Alert: projected $${costEstimate.projected_daily_cost}/day ` +
      `(threshold $${costEstimate.threshold_used}) | est. runs today: ${costEstimate.estimated_runs_today}` +
      ` | scanner throttled to 3h for rest of day`
    );
  }

  const msg = lines.join("\n");
  console.log(msg);
  await sendOpsMessage(msg);

  console.log("health-check complete");
}

main().catch(async (err) => {
  console.error("health-check fatal:", err.message);
  await sendOpsMessage(`AgentCrush health-check failed: ${err.message}`).catch(() => {});
  process.exit(1);
});
