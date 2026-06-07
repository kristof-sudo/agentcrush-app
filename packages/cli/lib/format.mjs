/**
 * Output formatters — human table, JSON passthrough, CSV
 */

// ANSI colours (no deps)
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  grey: '\x1b[90m',
};

const noColor = process.env.NO_COLOR || !process.stdout.isTTY;
const c = (code, s) => noColor ? s : `${code}${s}${C.reset}`;

export function bold(s)  { return c(C.bold, s); }
export function dim(s)   { return c(C.dim, s); }
export function green(s) { return c(C.green, s); }
export function yellow(s){ return c(C.yellow, s); }
export function cyan(s)  { return c(C.cyan, s); }
export function red(s)   { return c(C.red, s); }
export function grey(s)  { return c(C.grey, s); }

/** Print raw JSON (--json flag) */
export function printJson(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

/** Print a simple 2-col key/value block */
export function printKv(obj, { indent = 0 } = {}) {
  const pad = ' '.repeat(indent);
  const keys = Object.keys(obj);
  const maxLen = Math.max(...keys.map(k => k.length));
  for (const [k, v] of Object.entries(obj)) {
    const key = k.padEnd(maxLen);
    const val = v == null ? grey('—') : String(v);
    console.log(`${pad}${grey(key)}  ${val}`);
  }
}

/** Print a table. rows = array of objects, cols = [{key, label, width?}] */
export function printTable(rows, cols) {
  if (!rows || rows.length === 0) {
    console.log(grey('  (no results)'));
    return;
  }
  // header
  const header = cols.map(c => bold(String(c.label || c.key).padEnd(c.width || 20))).join('  ');
  console.log(header);
  console.log(grey(cols.map(c => '─'.repeat(c.width || 20)).join('  ')));
  for (const row of rows) {
    const line = cols.map(c => {
      const v = row[c.key] == null ? '—' : String(row[c.key]);
      return v.slice(0, c.width || 20).padEnd(c.width || 20);
    }).join('  ');
    console.log(line);
  }
}

/** Trust score colour — green ≥80, yellow 60-79, red <60 */
export function trustColor(score) {
  if (score == null) return grey('—');
  const n = Number(score);
  if (n >= 80) return green(String(n));
  if (n >= 60) return yellow(String(n));
  return red(String(n));
}

/** Rank delta arrow */
export function deltaArrow(delta) {
  if (delta == null || delta === 0) return grey('—');
  if (delta > 0) return green(`▲${delta}`);
  return red(`▼${Math.abs(delta)}`);
}

/** Format a number with optional unit */
export function fmt(n, unit = '') {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US') + (unit ? ` ${unit}` : '');
}
