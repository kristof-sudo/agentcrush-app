# AgentCrush Audit Toolkit

A small, runnable toolkit of **audit primitives** used by AgentCrush Labs to
evaluate the agent-commerce readiness of an AI/agent project. Each primitive
is a focused, evidence-producing check that runs against a GitHub repo URL or
a local source tree and emits a structured JSON result plus a short markdown
fragment suitable for pasting into a Labs audit report.

This toolkit is internal to AgentCrush. It is not a product surface; it
backs the **Agent Commerce Readiness Audit** (Labs Offer 1) and the public
case studies that prove the methodology.

## Layout

```
tools/audit/
  README.md                 — this file
  run.mjs                   — CLI wrapper
  primitives/
    README.md               — index of available primitives
    default_judge_model_disclosure.mjs
    _lib.mjs                — shared helpers (clone, scan, etc.)
```

## Usage

```bash
# run a primitive against a GitHub repo
node tools/audit/run.mjs \
  --primitive default_judge_model_disclosure \
  --target https://github.com/braintrustdata/autoevals

# or against a local checkout
node tools/audit/run.mjs \
  --primitive default_judge_model_disclosure \
  --target /path/to/local/repo

# JSON only (no markdown fragment)
node tools/audit/run.mjs --primitive ... --target ... --json
```

Output is two blocks on stdout: a JSON object (machine-readable) and a
markdown fragment (human-readable). Use `--json` to suppress the markdown.

## Primitives

Labs Offer 1 bundles **7 audit primitives** (all derived from the
`agentcrush-field-lab` field reports). See [`primitives/README.md`](./primitives/README.md)
for the full list and current implementation status.

## Adding a new primitive

1. Create `primitives/<name>.mjs` exporting:
   - `name: string`
   - `description: string`
   - `async run(target: { kind: "local"|"github", path: string, url?: string }): Promise<Result>`
2. The `Result` shape is:
   ```ts
   {
     primitive: string,
     target: string,
     status: "disclosed" | "partial" | "undisclosed" | "not_applicable",
     evidence: Array<{ file: string, line?: number, snippet?: string, kind: string }>,
     notes: string
   }
   ```
3. Add an entry to `primitives/README.md`.
4. Wire it into `run.mjs`'s primitive registry.

## Design rules

- **Static analysis first.** Most primitives are file-scan + pattern-match.
  LLM calls are a last resort; if used, default to Haiku.
- **Fast.** Each primitive should complete in <60s on a typical small/mid
  repo. Shallow-clone, stream where possible, bail early on huge trees.
- **Evidence-citing.** Every finding must point to a file (and ideally a
  line) the auditor can verify by hand.
- **Repo-safe.** Primitives are read-only. Clones go to OS temp dir and are
  cleaned up after.
