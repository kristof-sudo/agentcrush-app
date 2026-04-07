/**
 * X API daily cost tracker.
 * Buffer cap: $1.90/day — stops accepting new calls at this level.
 * Hard cap: $2.00/day — absolute ceiling; accounting never exceeds this.
 *
 * Cost per call: $0.0077 (recalibrated 2026-04-05 from actual X dashboard).
 * Method: $2.50 actual spend / 326 tracked calls = $0.00767 → rounded to $0.0077.
 * Previous value ($0.0033) was 2.32× too low, causing the daily cap to not trigger.
 * Recalibrate periodically: actual_dashboard_usd / calls_today from runs table.
 */

import fs from "node:fs";

const COST_FILE = "/opt/agentcrush/state/x_api_cost.json";
const COST_PER_CALL_USD = 0.0077;
const BUFFER_CAP_USD = 1.90;  // stop new calls here
const HARD_CAP_USD = 2.00;    // accounting ceiling

function todayUTC() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function load() {
  try {
    const raw = fs.readFileSync(COST_FILE, "utf8");
    const data = JSON.parse(raw);
    if (data.date === todayUTC()) return data;
  } catch {}
  return { date: todayUTC(), calls_today: 0, estimated_usd: 0, paused: false };
}

function save(state) {
  try {
    fs.mkdirSync("/opt/agentcrush/state", { recursive: true });
    fs.writeFileSync(COST_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("x-api-cost: write failed", err.message);
  }
}

/** Returns { allowed, callsToday, estimatedUsd, reason? } */
export function checkXApiCap() {
  const s = load();
  if (s.paused || s.estimated_usd >= BUFFER_CAP_USD) {
    const reason = s.estimated_usd >= HARD_CAP_USD ? "hard_cap_$2" : "buffer_cap_$1.90";
    return { allowed: false, callsToday: s.calls_today, estimatedUsd: s.estimated_usd, reason };
  }
  return { allowed: true, callsToday: s.calls_today, estimatedUsd: s.estimated_usd };
}

/**
 * Record n API calls. Returns { paused, callsToday, estimatedUsd }.
 * Caps accounting at HARD_CAP_USD so the state file never reflects more than $2.00.
 */
export function recordXApiCalls(count = 1) {
  const s = load();
  s.calls_today += count;
  s.estimated_usd = Math.min(s.estimated_usd + count * COST_PER_CALL_USD, HARD_CAP_USD);
  if (s.estimated_usd >= BUFFER_CAP_USD) s.paused = true;
  save(s);
  return { paused: s.paused, callsToday: s.calls_today, estimatedUsd: s.estimated_usd };
}
