# Scout / Judge Contracts v1

Phase 8 foundation. Defines bounded role contracts for Scout and Judge.
Not a swarm. Not autonomous. Deterministic dispatch only.

---

## 1. Scout Role

**Purpose:** Collect and surface a specific, bounded signal from a defined source. Scout does not interpret — it retrieves and structures.

**Allowed inputs:**
- A single query or search target (keyword, handle, topic)
- A source identifier (X, GitHub, Supabase table)
- A workflow_id and trace_id from the dispatching workflow

**Allowed outputs:**
- A structured JSON findings object written to `workflow_events.output` (raw results, candidates, or source summaries)
- Status: `done` or `failed`

**Forbidden actions:**
- May not write to the agents table directly
- May not trigger deploys, publishes, or migrations
- May not dispatch another Scout or Judge
- May not write to workflow_decisions or workflow_summaries (Judge only)
- May not access unbounded data sets (must use explicit limit)

**Dispatch trigger:**
- Explicitly invoked by a parent workflow step with a valid workflow_id and trace_id
- Never self-triggered, scheduled independently, or invoked ad hoc

**Success condition:**
- Output is a non-empty structured JSON findings object
- Workflow event status set to `done`
- No writes beyond `workflow_events.output` for this step

---

## 2. Judge Role

**Purpose:** Evaluate a Scout output or a bounded set of workflow_events and produce a structured decision. Judge does not collect — it evaluates and records.

**Allowed inputs:**
- A workflow_id pointing to completed Scout output(s)
- A bounded context window (max: last 10 workflow_events for the workflow)
- A decision prompt (explicit question to answer)

**Allowed outputs:**
- A structured decision written to `workflow_decisions`
- A summary written to `workflow_summaries`
- A workflow_reviews record with `approved` or `rejected`
- Status: `done` or `failed`

**Forbidden actions:**
- May not fetch new data from external sources (X, GitHub, APIs)
- May not trigger deploys, publishes, or migrations
- May not dispatch another Judge or Scout
- May not write a `workflow_reviews` record for any step that Judge itself produced — Judge may only review steps whose `role` is not `judge`
- May not access unbounded memory or prior workflow history

**Dispatch trigger:**
- Explicitly invoked after a Scout step completes within the same workflow
- Never self-triggered or scheduled independently

**Success condition:**
- A `workflow_decisions` record exists with a non-null decision
- A `workflow_reviews` record exists with a clear `approved` or `rejected`
- Workflow event status set to `done`

---

## 3. Deterministic Dispatch Rules

**When Scout can run:**
- A workflow exists with status `in_progress`
- The dispatching step has a valid trace_id
- The data source and query are explicitly defined in the task input
- The result limit is explicitly set (no unbounded queries)

**When Judge can run:**
- A prior Scout step in the same workflow has status `done`
- The Judge input references the Scout's trace_id explicitly
- The bounded context (max 10 events) is passed in input

**What Scout and Judge are NOT allowed to trigger:**
- Deploys (`deploy` task_type)
- Publishes (`publish` task_type)
- Migrations (`migration` task_type)
- Other Scout or Judge invocations (no recursive dispatch)
- Any workflow status transitions beyond their own step

**Hard limits:**
- Dispatch must originate from an explicit parent workflow step — no ad hoc invocation, no self-scheduling, no recursive dispatch
- No direct publishing — output must pass through the normal approval gate
- No direct deploy — changes must go through the Phase 4 review gate
- No unbounded memory — context window is always explicitly bounded per invocation

---

## 4. Minimal Execution Examples

### Example: Scout job

```
workflow_id:  wf_20260407_abc123
trace_id:     tr_wf_20260407_abc123_01
role:         scout
task_type:    analysis
input: {
  source: "x",
  query: "AutoGPT",
  limit: 20
}

→ output: {
  matches: [...],       // raw structured results
  count: 12,
  skipped: 8,
  query: "AutoGPT"
}
→ status: done
```

### Example: Judge job

```
workflow_id:  wf_20260407_abc123
trace_id:     tr_wf_20260407_abc123_02
role:         judge
task_type:    analysis
input: {
  evaluate_trace_id: "tr_wf_20260407_abc123_01",
  question: "Should AutoGPT ranking be updated based on signal volume?",
  context_limit: 10
}

→ output: {
  verdict: "yes",
  confidence: "high",
  reason: "12 mentions in 24h exceeds threshold of 5"
}
→ workflow_decisions: { action: "recommend_ranking_update", reason: "signal volume threshold exceeded" }
→ workflow_reviews:   { review_status: "approved", review_notes: "Signal clear, recommend update" }
→ workflow_summaries: { summary: "AutoGPT signal volume exceeds threshold. Ranking update recommended." }
→ status: done
```
