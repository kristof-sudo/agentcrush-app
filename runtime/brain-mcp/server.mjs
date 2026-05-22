#!/usr/bin/env node
/**
 * agentcrush-brain-mcp — MCP server exposing the brain repo as queryable tools
 * (Phase 2 #3 of the AI-infrastructure architecture decision).
 *
 * Replaces grep + Read + SSH for the COO (Claude Code) and any other MCP-aware
 * client (Claude Desktop, Cursor, etc.) wanting to query brain state.
 *
 * Tools:
 *   get_state           — return current STATE.md (full)
 *   search_log          — search Log.md entries (query, optional since_date, limit)
 *   append_log          — append a new entry to Log.md (agent, did[], decided[], open[], handoff[])
 *   get_decisions       — list Decisions/ files or read one by id
 *   list_queue          — return Queue/open.md (full)
 *   read_agent_output   — read latest (or named) file from Agents/<name>/output/
 *
 * Env:
 *   BRAIN_PATH  — absolute path to agentcrush-brain checkout (default: /Users/pk/projects/agentcrush-brain)
 *
 * Transport: stdio. Register in Claude Code with:
 *   claude mcp add brain node /absolute/path/to/runtime/brain-mcp/server.mjs
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';

const BRAIN_PATH = process.env.BRAIN_PATH || '/Users/pk/projects/agentcrush-brain';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readFile(rel) {
  return fs.readFile(path.join(BRAIN_PATH, rel), 'utf-8');
}

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

function errorResult(message) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

// Log.md entries are blocks separated by lines starting with "## YYYY-MM-DD".
// Return an array of {header, body, ts?} so search/filter can operate per-entry.
function splitLogEntries(raw) {
  const lines = raw.split('\n');
  const entries = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(\d{4}-\d{2}-\d{2})(.*)$/);
    if (m) {
      if (current) entries.push(current);
      current = { date: m[1], header: line, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) entries.push(current);
  return entries.map((e) => ({
    date: e.date,
    header: e.header,
    text: `${e.header}\n${e.body.join('\n')}`.trim(),
  }));
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'agentcrush-brain',
  version: '0.1.0',
});

// get_state ───────────────────────────────────────────────────────────────────
server.tool(
  'get_state',
  'Return the current STATE.md from the brain. This is the canonical snapshot of week focus, product state, open blockers, and the running phase status. Read this first whenever you need to know what AgentCrush is currently working on.',
  {},
  async () => {
    try {
      return textResult(await readFile('STATE.md'));
    } catch (err) {
      return errorResult(`Failed to read STATE.md: ${err.message}`);
    }
  },
);

// search_log ──────────────────────────────────────────────────────────────────
server.tool(
  'search_log',
  'Search Log.md entries by substring (case-insensitive). Returns matching entry blocks newest-first. Use this instead of grep for cross-session memory: "what did I decide about X", "when did Y ship", "what was the conclusion of incident Z".',
  {
    query: z.string().describe('Substring to match (case-insensitive). Searches both headers and body.'),
    since: z
      .string()
      .optional()
      .describe('Only return entries on or after this date (YYYY-MM-DD). Defaults to all history.'),
    limit: z.number().int().min(1).max(50).optional().describe('Max entries to return (default 10).'),
  },
  async ({ query, since, limit = 10 }) => {
    try {
      const raw = await readFile('Log.md');
      const entries = splitLogEntries(raw);
      const q = query.toLowerCase();
      const filtered = entries
        .filter((e) => e.text.toLowerCase().includes(q))
        .filter((e) => !since || e.date >= since)
        .reverse()
        .slice(0, limit);
      if (filtered.length === 0) {
        return textResult(`No Log.md entries match "${query}"${since ? ` since ${since}` : ''}.`);
      }
      return textResult(filtered.map((e) => e.text).join('\n\n---\n\n'));
    } catch (err) {
      return errorResult(`search_log failed: ${err.message}`);
    }
  },
);

// append_log ──────────────────────────────────────────────────────────────────
server.tool(
  'append_log',
  'Append a new dated entry to Log.md. Use at end of meaningful work to leave a trail future sessions can find via search_log. Format matches the template at the top of Log.md.',
  {
    agent: z.string().describe('Who is writing — e.g. "Claude Code", "Ajsa", "Kris".'),
    did: z.array(z.string()).describe('Bullet points of what was done this session.'),
    decided: z.array(z.string()).optional().describe('Bullets of decisions made (optional).'),
    open: z.array(z.string()).optional().describe('Bullets of open items remaining (optional).'),
    handoff: z.array(z.string()).optional().describe('Bullets for the next session/agent (optional).'),
  },
  async ({ agent, did, decided = [], open = [], handoff = [] }) => {
    try {
      const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const fmt = (arr) => (arr.length ? arr.map((x) => `- ${x}`).join('\n') : '-');
      const block = `\n## ${ts} — ${agent}\n\n**Did:**\n${fmt(did)}\n\n**Decided:**\n${fmt(decided)}\n\n**Open:**\n${fmt(open)}\n\n**Hand-off:**\n${fmt(handoff)}\n`;
      await fs.appendFile(path.join(BRAIN_PATH, 'Log.md'), block);
      return textResult(`Appended entry "${ts} — ${agent}" to Log.md.`);
    } catch (err) {
      return errorResult(`append_log failed: ${err.message}`);
    }
  },
);

// get_decisions ───────────────────────────────────────────────────────────────
server.tool(
  'get_decisions',
  'List decision files in Decisions/ (no id arg) or read a specific one (with id). Decisions are the canonical record of why we chose X over Y — read these before re-litigating closed questions.',
  {
    id: z
      .string()
      .optional()
      .describe('Decision file basename without extension (e.g. "2026-05-21-strategy-reset-build-attention-first"). Omit to list all.'),
  },
  async ({ id }) => {
    const dir = path.join(BRAIN_PATH, 'Decisions');
    try {
      if (!id) {
        const files = (await fs.readdir(dir))
          .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
          .sort()
          .reverse();
        return textResult(`${files.length} decision(s):\n${files.map((f) => `- ${f.replace(/\.md$/, '')}`).join('\n')}`);
      }
      const filename = id.endsWith('.md') ? id : `${id}.md`;
      const content = await fs.readFile(path.join(dir, filename), 'utf-8');
      return textResult(content);
    } catch (err) {
      return errorResult(`get_decisions failed: ${err.message}`);
    }
  },
);

// list_queue ──────────────────────────────────────────────────────────────────
server.tool(
  'list_queue',
  'Return Queue/open.md — the current work-in-progress list grouped by critical path / product / distribution / done. Read this to know what is actively being worked on.',
  {},
  async () => {
    try {
      return textResult(await readFile('Queue/open.md'));
    } catch (err) {
      return errorResult(`list_queue failed: ${err.message}`);
    }
  },
);

// read_agent_output ───────────────────────────────────────────────────────────
server.tool(
  'read_agent_output',
  'Read a file from an agent silo at Agents/<name>/output/. Without `file`, returns the most recent output. Use to pull e.g. today\'s Ajsa social brief without SSH.',
  {
    agent: z.string().describe('Agent silo name (e.g. "ajsa").'),
    file: z.string().optional().describe('Specific filename inside output/. Omit for the most recent file.'),
  },
  async ({ agent, file }) => {
    try {
      const dir = path.join(BRAIN_PATH, 'Agents', agent, 'output');
      let target = file;
      if (!target) {
        const files = (await fs.readdir(dir)).filter((f) => !f.startsWith('.')).sort();
        if (files.length === 0) return errorResult(`No output files in Agents/${agent}/output/`);
        target = files[files.length - 1];
      }
      const content = await fs.readFile(path.join(dir, target), 'utf-8');
      return textResult(`# ${target}\n\n${content}`);
    } catch (err) {
      return errorResult(`read_agent_output failed: ${err.message}`);
    }
  },
);

// ── Boot ──────────────────────────────────────────────────────────────────────

// Graceful exit if the client closes the pipe (smoke tests, etc.) — without
// this the SDK transport throws an unhandled EPIPE on send-after-close.
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const transport = new StdioServerTransport();
await server.connect(transport);
// Stderr is fine for boot diagnostics; stdout is the JSON-RPC channel.
console.error(`[brain-mcp] connected. BRAIN_PATH=${BRAIN_PATH}`);
