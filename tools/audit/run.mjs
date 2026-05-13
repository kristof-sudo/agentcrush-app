#!/usr/bin/env node
// AgentCrush Audit CLI.
//
// Usage:
//   node tools/audit/run.mjs --primitive <name> --target <github-url-or-path> [--json]

import { resolveTarget } from "./primitives/_lib.mjs";
import * as defaultJudge from "./primitives/default_judge_model_disclosure.mjs";

const REGISTRY = {
  [defaultJudge.name]: defaultJudge,
};

function parseArgs(argv) {
  const args = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--primitive" || a === "-p") args.primitive = argv[++i];
    else if (a === "--target" || a === "-t") args.target = argv[++i];
    else if (a === "--json") args.json = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--list") args.list = true;
  }
  return args;
}

function usage() {
  console.log(
    `AgentCrush Audit CLI

Usage:
  node tools/audit/run.mjs --primitive <name> --target <github-url-or-path> [--json]
  node tools/audit/run.mjs --list

Options:
  -p, --primitive   primitive name (see --list)
  -t, --target      github repo URL or local directory path
      --json        emit JSON only (suppress markdown fragment)
      --list        list available primitives

Available primitives:
${Object.values(REGISTRY).map((p) => `  - ${p.name}: ${p.description}`).join("\n")}
`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (args.list) {
    for (const p of Object.values(REGISTRY)) console.log(`${p.name}\t${p.description}`);
    return;
  }
  if (!args.primitive || !args.target) {
    usage();
    process.exit(2);
  }
  const primitive = REGISTRY[args.primitive];
  if (!primitive) {
    console.error(`Unknown primitive: ${args.primitive}`);
    console.error(`Available: ${Object.keys(REGISTRY).join(", ")}`);
    process.exit(2);
  }

  const target = await resolveTarget(args.target);
  try {
    const result = await primitive.run(target);
    // JSON block first.
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (!args.json && typeof primitive.renderMarkdown === "function") {
      process.stdout.write("\n---\n\n");
      process.stdout.write(primitive.renderMarkdown(result));
    }
  } finally {
    await target.cleanup();
  }
}

main().catch((err) => {
  console.error(`audit error: ${err.message}`);
  process.exit(1);
});
