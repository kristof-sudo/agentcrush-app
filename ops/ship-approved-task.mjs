#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function printResultAndExit(result, exitCode) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(exitCode);
}

function fail(failedStage, error) {
  const message = error instanceof Error ? error.message : String(error);
  printResultAndExit(
    {
      merged: false,
      deployed: false,
      health: false,
      failed_stage: failedStage,
      error: message,
    },
    1
  );
}

function usage() {
  fail(
    "input",
    "Usage: ./ops/ship-approved-task.mjs --repo <owner/name> --pr <number> --approved"
  );
}

function parseArgs(argv) {
  const options = {
    approved: false,
    pr: null,
    repo: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--approved") {
      options.approved = true;
      continue;
    }

    if (arg === "--repo") {
      options.repo = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--pr") {
      options.pr = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      usage();
    }

    fail("input", `Unknown argument: ${arg}`);
  }

  return options;
}

function getPrNumber(prInput) {
  const prNumber = Number(prInput);

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    fail("input", "Missing or invalid --pr value.");
  }

  return prNumber;
}

function getRepo(repoInput) {
  const repo = repoInput ?? process.env.GITHUB_REPOSITORY;

  if (typeof repo !== "string" || !repo.includes("/")) {
    fail("input", "Missing or invalid --repo value, and GITHUB_REPOSITORY is not set.");
  }

  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    fail("input", `Invalid repository value: ${repo}`);
  }

  return { owner, name };
}

async function mergePullRequest({ pr, repo }) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    fail("merge", "Missing GITHUB_TOKEN.");
  }

  const prNumber = getPrNumber(pr);
  const { owner, name } = getRepo(repo);

  let response;

  try {
    response = await fetch(
      `https://api.github.com/repos/${owner}/${name}/pulls/${prNumber}/merge`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "agentcrush-ship-approved-task",
        },
        body: JSON.stringify({ merge_method: "squash" }),
      }
    );
  } catch (error) {
    fail("merge", error);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const details = payload?.message || `GitHub merge failed with status ${response.status}.`;
    fail("merge", details);
  }

  if (!payload?.merged) {
    fail("merge", payload?.message || "GitHub did not report a merged PR.");
  }
}

function runStage(command, args, failedStage, priorState) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  if (result.error) {
    printResultAndExit(
      {
        ...priorState,
        failed_stage: failedStage,
        error: result.error.message,
      },
      1
    );
  }

  if (result.status !== 0) {
    printResultAndExit(
      {
        ...priorState,
        failed_stage: failedStage,
        error: `${command} ${args.join(" ")} exited with status ${result.status}.`,
      },
      1
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    usage();
  }

  const options = parseArgs(args);

  if (!options.repo) {
    fail("input", "Missing --repo.");
  }

  if (!options.pr) {
    fail("input", "Missing --pr.");
  }

  if (!options.approved) {
    fail("approval", "Approval flag missing. Re-run with --approved.");
  }

  await mergePullRequest(options);

  runStage("bash", ["deploy/deploy-prod.sh"], "deploy", {
    merged: true,
    deployed: false,
    health: false,
  });

  runStage("bash", ["ops/health-check.sh"], "health", {
    merged: true,
    deployed: true,
    health: false,
  });

  printResultAndExit(
    {
      merged: true,
      deployed: true,
      health: true,
      failed_stage: null,
    },
    0
  );
}

try {
  await main();
} catch (error) {
  fail("failed", error);
}
