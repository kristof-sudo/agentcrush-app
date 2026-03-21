import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MAX_RECENT_POSTS = 12;
const MAX_ROUNDUP_ITEMS = 4;
const ROUNDUP_LOOKBACK_HOURS = 24;
const MAX_RECENT_INTERNAL_POSTS = 1;

function safeString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function randItem(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function logRun(status, meta = {}, error = null) {
  try {
    await supabase.from("runs").insert([
      {
        runner: "canon_enqueuer",
        job: "tick",
        status,
        meta,
        error,
      },
    ]);
  } catch {
    // ignore log failures
  }
}

async function getRecentScheduledTexts() {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("payload, created_at")
    .eq("channel", "x")
    .order("created_at", { ascending: false })
    .limit(MAX_RECENT_POSTS);

  if (error) throw error;

  return (data || [])
    .map((r) => safeString(r.payload?.text))
    .filter(Boolean)
    .join("\n");
}

async function getRecentCanonHandles() {
  const { data, error } = await supabase
    .from("copydesk_jobs")
    .select("context, created_at")
    .eq("job_type", "x_post")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  const seen = new Set();

  for (const row of data || []) {
    const c = row.context || {};
    const a = safeString(c.agent_a?.handle || c.agent_a?.display_name);
    const b = safeString(c.agent_b?.handle || c.agent_b?.display_name);
    if (a) seen.add(a.toLowerCase());
    if (b) seen.add(b.toLowerCase());
  }

  return seen;
}

async function getRecentCanonModes() {
  const { data, error } = await supabase
    .from("copydesk_jobs")
    .select("context, created_at")
    .eq("job_type", "x_post")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) throw error;

  return (data || []).map((row) => ({
    mode: safeString(row.context?.mode),
    category: safeString(row.context?.category),
  }));
}

async function getActiveAgents() {
  const { data, error } = await supabase
    .from("agents")
    .select("id, handle, display_name, archetype, bio, visibility_score, reputation_score, status")
    .eq("status", "active")
    .order("visibility_score", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data || [];
}

async function getTopRealAgents() {
  const { data, error } = await supabase
    .from("agents")
    .select("id, handle, display_name, archetype, bio, visibility_score, reputation_score, status")
    .eq("status", "active")
    .not("handle", "is", null)
    .order("visibility_score", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []).filter((a) => {
    const h = safeString(a.handle).toLowerCase();
    if (!h) return false;
    return !(
      h.includes("debug") ||
      h.includes("test") ||
      h.includes("intern") ||
      h.includes("felixoc") // keep demo-heavy internals from dominating hybrid mode
    );
  });
}

async function getRoundupCandidates() {
  const since = new Date(Date.now() - ROUNDUP_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("interaction_jobs")
    .select("*")
    .eq("action_type", "roundup_candidate")
    .eq("status", "queued")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

function summarizeInternalSolo(agent) {
  const templates = [
    `${agent.display_name || agent.handle} has been showing up in the right places again.`,
    `${agent.display_name || agent.handle} keeps drifting upward without making much noise.`,
    `${agent.display_name || agent.handle} is building a habit of appearing near the top when things get busy.`,
    `${agent.display_name || agent.handle} looks quiet until you check the rankings twice.`,
  ];
  return randItem(templates);
}

function summarizeInternalPair(a, b) {
  const aName = a.display_name || a.handle;
  const bName = b.display_name || b.handle;

  const templates = [
    `${aName} and ${bName} have started appearing near each other often enough to become suspicious.`,
    `${aName} keeps turning up close to ${bName}. Either timing is weird or the rankings know something.`,
    `${aName} and ${bName} are developing the kind of leaderboard proximity that usually means something later.`,
    `${aName} is lingering near ${bName} again. The ecosystem has patterns. This one keeps returning.`,
  ];
  return randItem(templates);
}

function summarizeHybrid(realAgent, observed) {
  const aName = realAgent.display_name || realAgent.handle;
  const sourceHandle = safeString(observed.target_author_handle);
  const txt = safeString(observed.target_text);

  if (txt) {
    return `${aName} would fit this part of the ecosystem better than most people realize. ${sourceHandle ? `Watching ${sourceHandle} makes that more obvious.` : ""}`.trim();
  }

  return `${aName} would make more sense in this conversation than most of the accounts currently in it.`;
}

function buildRoundupItems(candidates) {
  return candidates.slice(0, MAX_ROUNDUP_ITEMS).map((row) => ({
    name: safeString(row.target_author_name) || safeString(row.target_author_handle),
    handle: safeString(row.target_author_handle)
      ? `@${safeString(row.target_author_handle).replace(/^@/, "")}`
      : "",
    summary: safeString(row.context_summary) || safeString(row.target_text).slice(0, 140),
    source: "x",
    metric: "",
  }));
}

async function enqueueJob(payload) {
  const { error } = await supabase.from("copydesk_jobs").insert([payload]);
  if (error) throw error;
}

async function markRoundupCandidatesUsed(ids) {
  if (!ids.length) return;
  const { error } = await supabase
    .from("interaction_jobs")
    .delete()
    .in("id", ids);

  if (error) throw error;
}

function canUseInternalNarrative(recentModes) {
  const recentInternalCount = (recentModes || []).filter((row) => {
    return row.mode === "canon_internal" || row.category === "agentcrush_internal";
  }).length;

  return recentInternalCount < MAX_RECENT_INTERNAL_POSTS;
}

function chooseMode({ roundupCandidates, activeAgents, recentModes }) {
  if (roundupCandidates.length >= 3) return "ecosystem_roundup";
  if (roundupCandidates.length >= 1) return "canon_hybrid";
  if (!canUseInternalNarrative(recentModes)) return "skip";
  if (activeAgents.length >= 1) return "canon_internal";
  return "canon_internal";
}

async function buildInternalJob(activeAgents, recentHandles, recentPosts) {
  const freshAgents = activeAgents.filter((a) => !recentHandles.has(safeString(a.handle).toLowerCase()));
  const pool = freshAgents.length >= 2 ? freshAgents : activeAgents;

  const shuffled = shuffle(pool);
  const a = shuffled[0];
  const b = shuffled[1];

  const pairMode = Boolean(a && b && Math.random() < 0.65);

  const summary = pairMode ? summarizeInternalPair(a, b) : summarizeInternalSolo(a);

  return {
    job_type: "x_post",
    status: "queued",
    priority: 60,
    subject_type: "canon_memory",
    subject_id: null,
    context: {
      mode: "canon_internal",
      post_type: pairMode ? "micro_scene" : "solo_observation",
      style_preference: "light_narrative",
      event_key: pairMode ? "ranking_proximity" : "visibility_pattern",
      category: "agentcrush_internal",
      summary,
      agent_a: a || {},
      agent_b: pairMode ? b || {} : {},
      recent_posts: recentPosts,
    },
    max_chars: 260,
    schema_version: 1,
  };
}

async function buildHybridJob(realAgents, roundupCandidates, recentPosts) {
  const realAgent = randItem(realAgents);
  const observed = randItem(roundupCandidates);

  if (!realAgent || !observed) {
    return null;
  }

  const summary = summarizeHybrid(realAgent, observed);

  return {
    job_type: "x_post",
    status: "queued",
    priority: 32,
    subject_type: "canon_memory",
    subject_id: null,
    context: {
      mode: "canon_hybrid",
      post_type: "hybrid_observation",
      style_preference: "observation",
      event_key: "external_ecosystem_overlap",
      category: "agentcrush_external_bridge",
      summary,
      agent_a: realAgent,
      agent_b: {},
      target_author: safeString(observed.target_author_handle),
      target_text: safeString(observed.target_text),
      context_summary: safeString(observed.context_summary),
      recent_posts: recentPosts,
    },
    max_chars: 260,
    schema_version: 1,
  };
}

async function buildRoundupJob(roundupCandidates, recentPosts) {
  const selected = shuffle(roundupCandidates).slice(0, MAX_ROUNDUP_ITEMS);
  const items = buildRoundupItems(selected);

  if (items.length < 3) return null;

  return {
    job_type: "x_post",
    status: "queued",
    priority: 30,
    subject_type: "ecosystem_roundup",
    subject_id: null,
    context: {
      mode: "ecosystem_roundup",
      post_type: "roundup",
      style_preference: "signal_amplification",
      category: "external_ecosystem",
      summary: "Real ecosystem roundup from recent AI-agent activity on X.",
      roundup_items: items,
      recent_posts: recentPosts,
    },
    max_chars: 260,
    schema_version: 1,
    _roundup_source_ids: selected.map((x) => x.id),
  };
}

async function queueHealthOkay() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("id, status, run_at")
    .eq("channel", "x")
    .eq("status", "queued")
    .gte("run_at", now)
    .order("run_at", { ascending: true });

  if (error) throw error;

  // allow queue to breathe; do not flood originals if many items are already lined up
  return (data || []).length < 6;
}

async function main() {
  const okayToEnqueue = await queueHealthOkay();
  if (!okayToEnqueue) {
    await logRun("ok", { msg: "queue_full_skip" });
    return;
  }

  const [recentPosts, recentHandles, recentModes, activeAgents, realAgents, roundupCandidates] = await Promise.all([
    getRecentScheduledTexts(),
    getRecentCanonHandles(),
    getRecentCanonModes(),
    getActiveAgents(),
    getTopRealAgents(),
    getRoundupCandidates(),
  ]);

  if (!activeAgents.length) {
    await logRun("error", { msg: "no_active_agents" }, "no_active_agents");
    return;
  }

  const mode = chooseMode({ roundupCandidates, activeAgents, recentModes });

  let job = null;

  if (mode === "ecosystem_roundup") {
    job = await buildRoundupJob(roundupCandidates, recentPosts);
    if (!job) {
      job = await buildInternalJob(activeAgents, recentHandles, recentPosts);
    }
  } else if (mode === "canon_hybrid") {
    job = await buildHybridJob(realAgents, roundupCandidates, recentPosts);
    if (!job) {
      job = await buildInternalJob(activeAgents, recentHandles, recentPosts);
    }
  } else if (mode === "skip") {
    await logRun("ok", { msg: "skip_internal_narrative_balance" });
    return;
  } else {
    job = await buildInternalJob(activeAgents, recentHandles, recentPosts);
  }

  if (!job) {
    await logRun("ok", { msg: "no_job_built" });
    return;
  }

  const roundupIds = job._roundup_source_ids || [];
  delete job._roundup_source_ids;

  await enqueueJob(job);

  if (roundupIds.length) {
    await markRoundupCandidatesUsed(roundupIds);
  }

  await logRun("ok", {
    msg: "job_enqueued",
    mode: job.context?.mode || "unknown",
    post_type: job.context?.post_type || "",
    roundup_count: roundupIds.length,
  });
}

main().catch(async (e) => {
  console.error("CANON_ENQUEUER_FATAL", e);
  await logRun(
    "error",
    {
      fatal: true,
      stack: String(e?.stack || ""),
    },
    String(e?.message || e)
  );
  process.exit(1);
});
