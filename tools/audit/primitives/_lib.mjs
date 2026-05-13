// Shared helpers for audit primitives.
//
// Read-only. Each helper either inspects a local tree or shallow-clones a
// GitHub repo into a tmpdir. Caller is responsible for cleanup (see
// `withTarget`).

import { spawn } from "node:child_process";
import { mkdtemp, rm, readdir, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

/** Run a child process and capture stdout. Rejects on non-zero exit. */
export function exec(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} exited ${code}: ${err.trim()}`));
    });
  });
}

/** Resolve a --target argument to a local path; clone if it's a GitHub URL. */
export async function resolveTarget(target) {
  if (!target) throw new Error("target is required");
  const isUrl = /^https?:\/\//.test(target) || /^git@/.test(target);
  if (!isUrl) {
    // local path
    const s = await stat(target).catch(() => null);
    if (!s || !s.isDirectory()) {
      throw new Error(`local target not found or not a directory: ${target}`);
    }
    return { kind: "local", path: target, url: null, cleanup: async () => {} };
  }
  const dir = await mkdtemp(join(tmpdir(), "agentcrush-audit-"));
  await exec("git", ["clone", "--depth=1", "--quiet", target, dir]);
  return {
    kind: "github",
    path: dir,
    url: target,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

// Directories we don't want to scan.
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "env",
  "__pycache__",
  ".pytest_cache",
  ".next",
  ".turbo",
  "dist",
  "build",
  "out",
  ".cache",
  "target",
  ".idea",
  ".vscode",
  "coverage",
  ".mypy_cache",
  ".ruff_cache",
]);

const TEXT_EXT = new Set([
  ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".md", ".mdx", ".rst", ".txt",
  ".yaml", ".yml", ".toml", ".json",
  ".go", ".rs", ".java", ".kt", ".rb", ".php", ".cs", ".swift",
]);

/** Walk a directory tree, yielding (relative path, absolute path) for text files. */
export async function* walk(root, { maxFiles = 20000 } = {}) {
  let count = 0;
  async function* visit(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (count >= maxFiles) return;
      if (e.name.startsWith(".") && SKIP_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        yield* visit(full);
      } else if (e.isFile()) {
        const lower = e.name.toLowerCase();
        const dot = lower.lastIndexOf(".");
        const ext = dot >= 0 ? lower.slice(dot) : "";
        if (!TEXT_EXT.has(ext)) continue;
        count++;
        yield { rel: relative(root, full).split(sep).join("/"), abs: full };
      }
    }
  }
  yield* visit(root);
}

/** Read a file as utf8 with a size cap (default 2MB). Returns null on read error. */
export async function readText(abs, maxBytes = 2 * 1024 * 1024) {
  try {
    const s = await stat(abs);
    if (s.size > maxBytes) return null;
    return await readFile(abs, "utf8");
  } catch {
    return null;
  }
}

/** Find lines matching a regex; returns [{line, text}] (1-indexed). */
export function findLines(text, regex) {
  const out = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) out.push({ line: i + 1, text: lines[i] });
  }
  return out;
}
