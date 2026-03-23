import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function upcomingSlotsUTC(daysAhead = 5) {
  const now = new Date();
  const slots = [
    { h: 8, m: 30 }, // 09:30 Budapest
    { h: 14, m: 0 }, // 15:00 Budapest
    { h: 20, m: 0 }, // 21:00 Budapest
  ];

  const out = [];

  for (let d = 0; d < daysAhead; d++) {
    for (const slot of slots) {
      const run = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + d,
        slot.h,
        slot.m,
        0
      ));

      if (run > now) out.push(run.toISOString());
    }
  }

  return out;
}

async function main() {
  const freshnessCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: outputs, error: outputsError } = await supabase
    .from("copydesk_outputs")
    .select("id, output, x_text, scheduled_post_id, created_at")
    .gte("created_at", freshnessCutoff)
    .is("scheduled_post_id", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (outputsError) {
    console.error("OUTPUTS QUERY ERROR:", outputsError);
    return;
  }

  if (!outputs || outputs.length === 0) {
    console.log("NO FRESH UNSCHEDULED OUTPUTS");
    return;
  }

  const { data: existingQueued, error: queueError } = await supabase
    .from("scheduled_posts")
    .select("id, run_at, payload")
    .eq("channel", "x")
    .eq("status", "queued")
    .order("run_at", { ascending: true });

  if (queueError) {
    console.error("QUEUE QUERY ERROR:", queueError);
    return;
  }

  const nowIso = new Date().toISOString();

  const futureQueued = (existingQueued || []).filter(p => p.run_at && p.run_at >= nowIso);
  const futureQueuedPosts = futureQueued.filter(p => (p.payload?.type || null) === "x_post");
  const futureQueuedInteractions = futureQueued.filter(p => {
    const t = p.payload?.type || null;
    return t === "x_reply" || t === "x_quote";
  });

  const post = outputs.find(o => {
    const type = o.output?.type;
    return type === "x_post" || type === "x_reply" || type === "x_quote";
  });

  if (!post) {
    console.log("NO UNSCHEDULED X CONTENT FOUND");
    return;
  }

  const type = post.output?.type;
  const text = String(post.x_text || post.output?.text || "").trim();

  if (!text) {
    console.log("CONTENT HAS NO TEXT, SKIPPING");
    return;
  }

  let chosenRunAt;

  if (type === "x_post") {
    if (futureQueuedPosts.length >= 3) {
      console.log("THREE FUTURE X_POSTS ALREADY QUEUED, SKIPPING NEW X_POST");
      return;
    }

    const futureSlots = upcomingSlotsUTC(5);
    const alreadyPlannedCount = futureQueuedPosts.length;

    chosenRunAt = futureSlots[alreadyPlannedCount];

    if (!chosenRunAt) {
      console.log("NO FUTURE X_POST SLOT AVAILABLE");
      return;
    }
  } else {
    if (futureQueuedInteractions.length >= 4) {
      console.log("TOO MANY FUTURE INTERACTIONS ALREADY QUEUED, SKIPPING");
      return;
    }

    const now = new Date();
    const interactionDelayMinutes = 15 + (futureQueuedInteractions.length * 10);
    chosenRunAt = new Date(now.getTime() + interactionDelayMinutes * 60 * 1000).toISOString();
  }

  const payload = {
    type,
    text,
    pr: post?.output?.pr ?? null
  };

  console.log("SCHEDULER PR DEBUG", JSON.stringify({ sourceOutputId: post?.id, outputPr: post?.output?.pr ?? null, payloadPr: payload?.pr ?? null }));

  const { data: scheduled, error: insertError } = await supabase
    .from("scheduled_posts")
    .insert({
      channel: "x",
      status: "queued",
      run_at: chosenRunAt,
      payload,
      approved: false,
      publish_ready: false,
      source_output_id: post.id
    })
    .select()
    .single();

  if (insertError) {
    console.error("SCHEDULE INSERT ERROR:", insertError);
    return;
  }

  if (!scheduled) {
    console.log("NO SCHEDULED ROW RETURNED");
    return;
  }

  const { error: updateError } = await supabase
    .from("copydesk_outputs")
    .update({ scheduled_post_id: scheduled.id })
    .eq("id", post.id);

  if (updateError) {
    console.error("OUTPUT UPDATE ERROR:", updateError);
    return;
  }

  console.log("SCHEDULED POST CREATED:", scheduled.id, "TYPE:", type, "RUN_AT:", chosenRunAt);
}

main().catch(err => {
  console.error("SCHEDULER PREP ERROR:", err);
  process.exit(1);
});
