/**
 * mobile-qa-checker — Phase 3 #3
 *
 * Visits the high-value agentcrush.xyz routes at iPhone 14 width (390px)
 * via Playwright + Chromium. Deterministic checks only (no LLM in v1):
 *   - HTTP response 200
 *   - No uncaught JS console errors
 *   - Page has horizontal overflow? (body.scrollWidth > 390)
 *   - Required selectors present (h1 + nav)
 * Captures one screenshot per route. Writes report + screenshots to
 * brain Agents/mobile-qa-checker/output/qa-YYYY-MM-DD/.
 *
 * Telegram alert ONLY on regression (any route fails). Otherwise silent.
 *
 * Why no LLM in v1: deterministic checks catch the common mobile regressions
 * (overflow, JS errors, missing nav) without the cost or non-determinism of
 * a model call. v2 can layer a vision review on the screenshots if needed.
 *
 * Env:
 *   BRAIN_PATH                  default /opt/agentcrush-brain
 *   TELEGRAM_BOT_TOKEN/CHAT_ID  required for regression alerts
 *   MOBILE_QA_BASE_URL          default https://agentcrush.xyz
 *   MOBILE_QA_ROUTES            comma-separated list, default below
 *   MOBILE_QA_FORCE_PUSH        "1" to always push report
 *
 * Schedule: daily 09:30 Budapest (after morning-brief + competitor-watcher).
 */

import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const BASE = (process.env.MOBILE_QA_BASE_URL || 'https://agentcrush.xyz').replace(/\/$/, '');
const DEFAULT_ROUTES = '/,/rankings,/rankings/model-families,/agent-economy,/labs,/how-we-rank,/surfaces/agentverse';
const ROUTES = (process.env.MOBILE_QA_ROUTES || DEFAULT_ROUTES).split(',').map((r) => r.trim()).filter(Boolean);
const FORCE_PUSH = process.env.MOBILE_QA_FORCE_PUSH === '1';
const RUN_DATE = process.env.RUN_DATE || new Date().toISOString().slice(0, 10);

const VIEWPORT_WIDTH = 390;

async function checkRoute(browser, route) {
  const context = await browser.newContext({
    ...devices['iPhone 14'],
    viewport: { width: VIEWPORT_WIDTH, height: 844 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Ignore sub-resource load failures (images/fonts, esp. third-party GitHub
    // avatars that intermittently 503 when ~1k load at once). These are network
    // flakiness, not JS regressions — the checker's job is "no uncaught JS errors,"
    // which still come through 'pageerror' and real console.error() calls below.
    if (/Failed to load resource/i.test(text)) return;
    consoleErrors.push(text.slice(0, 300));
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message.slice(0, 300)}`));

  const result = { route, url: `${BASE}${route}`, ok: true, failures: [] };

  let response;
  try {
    response = await page.goto(result.url, { waitUntil: 'networkidle', timeout: 30_000 });
  } catch (err) {
    result.ok = false;
    result.failures.push(`navigation: ${err.message.slice(0, 200)}`);
    await context.close();
    return result;
  }

  const status = response?.status();
  if (!status || status >= 400) { result.ok = false; result.failures.push(`http ${status}`); }

  // Horizontal overflow check
  const dims = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body?.scrollWidth || 0,
  }));
  if (dims.scrollWidth > VIEWPORT_WIDTH + 1 || dims.bodyScrollWidth > VIEWPORT_WIDTH + 1) {
    result.ok = false;
    result.failures.push(`horizontal overflow: scrollWidth=${dims.scrollWidth}, bodyScrollWidth=${dims.bodyScrollWidth} (viewport=${VIEWPORT_WIDTH})`);
  }

  // Required selectors
  const hasH1 = await page.locator('h1').first().isVisible().catch(() => false);
  if (!hasH1) { result.ok = false; result.failures.push('no visible <h1>'); }
  const hasNav = await page.locator('nav, header').first().isVisible().catch(() => false);
  if (!hasNav) { result.ok = false; result.failures.push('no visible <nav> or <header>'); }

  if (consoleErrors.length > 0) {
    result.ok = false;
    result.failures.push(`${consoleErrors.length} console error(s): ${consoleErrors[0]}`);
    result.consoleErrors = consoleErrors;
  }

  result.dims = dims;
  result.status = status;

  // Screenshot regardless of pass/fail — visual record
  const screenshotPath = path.join('screenshots', `${route.replace(/\//g, '_') || '_root'}.png`);
  result.screenshot = screenshotPath;
  result.screenshotBuffer = await page.screenshot({ fullPage: false });

  await context.close();
  return result;
}

async function pushTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.warn('[mobile-qa] Telegram env missing — skip push'); return; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) console.warn(`[mobile-qa] Telegram ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  else console.log(`[mobile-qa] Telegram sent (msg ${json.result?.message_id})`);
}

async function main() {
  console.log(`[mobile-qa] Date: ${RUN_DATE}  Base: ${BASE}  Routes: ${ROUTES.length}  Viewport: ${VIEWPORT_WIDTH}px`);

  const outDir = path.join(BRAIN_PATH, 'Agents', 'mobile-qa-checker', 'output', `qa-${RUN_DATE}`);
  const screenshotsDir = path.join(outDir, 'screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  for (const route of ROUTES) {
    try {
      const r = await checkRoute(browser, route);
      if (r.screenshotBuffer) {
        await fs.writeFile(path.join(outDir, r.screenshot), r.screenshotBuffer);
        delete r.screenshotBuffer;
      }
      results.push(r);
      console.log(`  ${r.ok ? '✓' : '✗'} ${route} ${r.ok ? '' : '— ' + r.failures.join('; ')}`);
    } catch (err) {
      results.push({ route, ok: false, failures: [`exception: ${err.message.slice(0, 200)}`] });
      console.log(`  ✗ ${route} — exception: ${err.message.slice(0, 200)}`);
    }
  }
  await browser.close();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  const lines = [
    `# Mobile QA — ${RUN_DATE}`,
    '',
    `**Base:** ${BASE}  **Viewport:** ${VIEWPORT_WIDTH}px (iPhone 14)  **Routes:** ${ROUTES.length}`,
    `**Result:** ${passed} passed, ${failed} failed`,
    '',
    '## Per-route',
    '',
  ];
  for (const r of results) {
    lines.push(`### ${r.ok ? '✅' : '❌'} \`${r.route}\``);
    lines.push(`- URL: ${r.url}`);
    if (r.status) lines.push(`- Status: ${r.status}`);
    if (r.dims) lines.push(`- Dimensions: scrollWidth=${r.dims.scrollWidth}, bodyScrollWidth=${r.dims.bodyScrollWidth}`);
    if (r.failures.length) lines.push(`- Failures:\n${r.failures.map((f) => `  - ${f}`).join('\n')}`);
    if (r.screenshot) lines.push(`- Screenshot: \`${r.screenshot}\``);
    lines.push('');
  }

  const reportPath = path.join(outDir, 'report.md');
  await fs.writeFile(reportPath, lines.join('\n'));
  console.log(`[mobile-qa] Wrote ${reportPath}`);

  if (failed > 0 || FORCE_PUSH) {
    const tag = failed > 0 ? `🚨 mobile-qa REGRESSION (${failed}/${ROUTES.length} failed)` : `🔧 mobile-qa forced (all ${passed} passed)`;
    const summary = results.filter((r) => !r.ok).slice(0, 3).map((r) => `❌ ${r.route}: ${r.failures.slice(0, 2).join('; ')}`).join('\n');
    await pushTelegram(`${tag}\n${summary || '(no detail)'}\n\nFull report: brain Agents/mobile-qa-checker/output/qa-${RUN_DATE}/report.md`);
  } else {
    console.log('[mobile-qa] all routes passed — skipping push');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[mobile-qa] FATAL: ${err.message}`);
  process.exit(1);
});
