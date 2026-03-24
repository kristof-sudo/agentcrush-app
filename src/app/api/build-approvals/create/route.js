import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendTelegramBuildApproval(row) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  }

  const text =
    `AgentCrush Build awaiting approval\n\n` +
    `ID: ${row.id}\n` +
    `Repo: ${row.repo}\n` +
    `Branch: ${row.branch}\n` +
    `Commit: ${row.commit_sha}\n\n` +
    `Request:\n${row.codex_summary || row.request_text}\n\n` +
    `Reply with:\n` +
    `APPROVE ${row.id}\n` +
    `REJECT ${row.id}`;

  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const data = await resp.json();

  if (!resp.ok || !data.ok) {
    throw new Error(data.description || `Telegram send failed with status ${resp.status}`);
  }

  return true;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const payload = {
      repo: body.repo,
      branch: body.branch,
      commit_sha: body.commit_sha,
      pr_number: body.pr_number ?? null,
      request_text: body.request_text,
      codex_summary: body.codex_summary,
      diff_summary: body.diff_summary,
      status: "pending",
    };

    const { data, error } = await supabase
      .from("build_approvals")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    let telegram_sent = false;
    let telegram_error = null;

    try {
      await sendTelegramBuildApproval(data);
      telegram_sent = true;
    } catch (err) {
      telegram_error = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      status: data.status,
      telegram_sent,
      telegram_error,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
