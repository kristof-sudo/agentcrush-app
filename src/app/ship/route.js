import { spawnSync } from "node:child_process";
import path from "node:path";

function parseScriptResult(stdoutText) {
  const lines = String(stdoutText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      continue;
    }
  }

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const repo = typeof body?.repo === "string" ? body.repo.trim() : "";
    const pr = body?.pr;
    const approved = body?.approved === true;

    if (!repo || !pr) {
      return Response.json(
        { error: "Missing repo or pr" },
        { status: 400 }
      );
    }

    const scriptPath = path.join(process.cwd(), "ops", "ship-approved-task.mjs");
    const args = [scriptPath, "--repo", repo, "--pr", String(pr)];

    if (approved) {
      args.push("--approved");
    }

    const childEnv = {
      ...process.env,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || process.env.AGENTCRUSH_GITHUB_TOKEN,
    };

    console.log("SHIP TRIGGERED", {
      repo,
      pr,
      approved,
      timestamp: new Date().toISOString()
    });

    const result = spawnSync(process.execPath, args, {
      cwd: process.cwd(),
      env: childEnv,
      encoding: "utf8",
    });

    const payload =
      parseScriptResult(result.stdout) ||
      parseScriptResult(result.stderr) ||
      {
        merged: false,
        deployed: false,
        health: false,
        failed_stage: "ship",
        error: result.error?.message || "Ship wrapper failed.",
      };

    const status =
      result.status === 0 ? 200 :
      payload.failed_stage === "input" || payload.failed_stage === "approval" ? 400 :
      500;

    return Response.json(payload, { status });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
