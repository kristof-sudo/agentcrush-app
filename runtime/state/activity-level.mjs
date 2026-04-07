/**
 * Daily activity level utility — shared across workers.
 *
 * Reads state/daily_activity.json. If missing or from a previous UTC date,
 * generates a new level for today and persists it.
 *
 * Weights: HIGH 28%, NORMAL 43%, QUIET 29%.
 * Weekend boost: QUIET→NORMAL, NORMAL→HIGH.
 */

import fs from "node:fs";

const ACTIVITY_FILE = "/opt/agentcrush/state/daily_activity.json";

// Target action mix (early-stage account — X blocks outbound replies/quotes until engagement history exists):
//   repost_comment: 1–3/day  |  reply from incoming: 0–2/day  |  original posts: max 1/day
// Priority order: reply (incoming only) → repost_comment → roundup → like
// Original-post cap is enforced separately in canon-enqueuer (hard limit: 1/day).
// x_reply only when reply_incoming event (author has already engaged us).
// x_quote: blocked — X rejects quotes from accounts without conversation history.
const LEVEL_DEFS = {
  HIGH: {
    caps: { reply: 3, repost_comment: 3, roundup_candidate: 3 },
    scanner_interval_min: 60,
  },
  // Weekend NORMAL — full interaction allocation
  NORMAL: {
    caps: { reply: 2, repost_comment: 2, roundup_candidate: 3 },
    scanner_interval_min: 60,
  },
  // Weekday NORMAL — targets lower end of range to stay within $2/day cap
  NORMAL_WEEKDAY: {
    caps: { reply: 2, repost_comment: 2, roundup_candidate: 2 },
    scanner_interval_min: 120,
  },
  QUIET: {
    caps: { reply: 1, repost_comment: 2, roundup_candidate: 2 },
    scanner_interval_min: 90,
  },
};

function todayUTCDateStr() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function isWeekend() {
  const day = new Date().getUTCDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

function pickBaseLevel() {
  const r = Math.random();
  if (r < 0.28) return "HIGH";
  if (r < 0.71) return "NORMAL"; // 0.28 + 0.43
  return "QUIET";
}

function bumpLevel(level) {
  if (level === "QUIET") return "NORMAL";
  if (level === "NORMAL") return "HIGH";
  return "HIGH";
}

/**
 * Returns the activity config for today.
 * Shape: { label: "HIGH"|"NORMAL"|"QUIET", caps: {...}, scanner_interval_min: number }
 */
export function getActivityLevel() {
  const today = todayUTCDateStr();

  try {
    const raw = fs.readFileSync(ACTIVITY_FILE, "utf8");
    const saved = JSON.parse(raw);
    if (saved.date === today && LEVEL_DEFS[saved.level]) {
      // Apply weekday-reduced caps for NORMAL level on non-weekend days
      if (saved.level === "NORMAL" && !saved.is_weekend) {
        return { label: "NORMAL", ...LEVEL_DEFS.NORMAL_WEEKDAY };
      }
      return { label: saved.level, ...LEVEL_DEFS[saved.level] };
    }
  } catch {
    // missing or corrupt — generate fresh
  }

  let level = pickBaseLevel();
  if (isWeekend()) {
    level = bumpLevel(level);
  }

  const record = {
    date: today,
    level,
    is_weekend: isWeekend(),
    generated_at: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(record, null, 2));
  } catch (err) {
    console.error("activity-level: failed to write state file", err.message);
  }

  return { label: level, ...LEVEL_DEFS[level] };
}
