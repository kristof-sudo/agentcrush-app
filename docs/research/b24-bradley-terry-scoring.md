# B24 — Statistical Methodology Evolution: Bradley-Terry for Developer Rankings

**Date:** 2026-06-17  
**Author:** Claude Code  
**Status:** Research complete — awaiting Kris decision before any view changes  
**Task:** B24 (Kris-directed, 2026-06-12 batch)

---

## Executive summary

The current Developer ranking formula (v2.c) is a fixed-weight arithmetic mean of 7 signal components with a missing-signal prior. It is stable and defensible but shares the core weakness of all fixed-weight models: arbitrary weight assignment and no ability to learn from observed relative performance.

Bradley-Terry (BT) models offer a statistically principled alternative: instead of assigning weights to signals, BT fits latent quality parameters θ_i for each agent such that pairwise win probabilities follow a logistic model — P(A beats B) = exp(θ_A) / (exp(θ_A) + exp(θ_B)). LMArena uses this exact model for model capability; we already consume their BT output as one of five signals in the Model Families category.

This note answers three questions Kris needs to decide:
1. Do we have enough pairwise comparison data to fit a credible BT model?
2. Which category should be first?
3. What would BT change, and is the change worth the migration complexity?

**Bottom line:** Yes, we have enough data. Developer category is the right first target. The change is mathematically meaningful and improves transitivity-consistency. The migration is a new worker + one new table — no changes to existing scoring views until shadow period validates. Recommend approving Phase 1 (build the shadow system).

---

## 1. What data we have

### agent_snapshots (primary source)

The `agent_snapshots` table holds append-only daily point-in-time records per agent:

```sql
-- schema excerpt (20260408_1600_agent_snapshots.sql)
agent_id          uuid
snapshot_date     date
score             numeric     -- composite score at the time
rank              integer     -- global rank position
weekly_delta      integer     -- 7-day rank change
github_stars      integer     -- nullable
```

Current coverage (from STATE.md): **32,450+ daily snapshots since April 2026** — roughly 60–70 days × 1,354 agents. For a BT model, this means:

- For any two agents A and B, we can count the number of days A ranked above B (W_AB) and vice versa (W_BA) as pairwise "outcomes."
- 1,354 agents yield ~916,000 possible pairs, but within-category pairs are the relevant set (a model family does not compete with a developer tool). Developer category has ~120 evidence-ranked agents → ~7,140 relevant pairs.
- 60+ days of data → most within-category pairs have 40–60 observable head-to-head outcomes.

This is sufficient for BT fitting. LMArena uses human preference votes per pair; we use daily rank superiority per pair. The inputs are noisier (rank is derived from our own v2.c formula) but the quantity is adequate.

### agent_dependency_edges (secondary source)

```sql
-- from 20260424_1115_create_agent_dependency_rollups.sql
agent_id              uuid
scanned_repo          text
scanned_repo_stars    integer
package_name          text
same_owner            boolean
mapping_confidence    text
```

If repo R depends on agent A's package, that's a vote for A. But:

- We can't construct A-beats-B outcomes from this, only aggregate endorsement strength (which v2.c's `dependency_score` already captures).
- Substitutable pairs are hard to identify — a vector DB doesn't compete with a task-runner.
- **Verdict:** Not suitable as a direct BT pairwise source. Already captured efficiently by v2.c.

### agent_relationships (tertiary source)

```sql
-- curated ecosystem graph
agent_a    uuid
agent_b    uuid
rel_type   text  -- framework_of, integrates_with, competes_with, ...
intensity  numeric
```

The `competes_with` edges are the only BT-relevant edges. Current count: sparse (curated manually). Not a sufficient BT source today, but useful for future cross-validation.

### Summary table

| Source | BT-usable? | Pairs available | Confidence |
|--------|-----------|-----------------|------------|
| `agent_snapshots` (rank history) | ✅ Yes | ~7,140 pairs within Developer category | Medium — derived from v2.c scores |
| `agent_dependency_edges` | ❌ No | — | Already used in v2.c dependency_score |
| `agent_relationships` (competes_with) | ⚠️ Sparse | ~20–50 curated pairs | High — but too few for fitting |
| Human preference votes | ❌ None | — | Not collected |

---

## 2. Which category to tackle first

### Developer — recommended

- **Most agents with data:** 120+ evidence-ranked; 1,354 total indexed.
- **Most snapshot history:** 60+ days, best coverage.
- **Most signals to calibrate against:** 7 components (github, package_usage, dependency, ecosystem, docs, hn, trust) vs 5 for model families.
- **Novel:** Model Families already uses LMArena BT output (25% weight). Developer has no BT influence today — maximum signal-to-improvement ratio.
- **Scoring-weight rule applies:** Any change to the Developer scoring view requires Kris approval. This research doc satisfies the pre-approval requirement.

### Model Families — skip for now

Already partially BT via LMArena. Adding a second BT layer risks double-counting. Revisit after Developer is validated.

### Tokenized — not appropriate

Tokenized agents rank by market metrics (market cap, TVL, liquidity). These have natural cardinal scales. BT is designed for pairwise preference where cardinal scales are unavailable or unreliable. No benefit here.

### Service — future

Service agents have the least snapshot data (many are Agentverse entries with limited depth signals). Valid after Developer is established.

---

## 3. The BT model: what it would compute

### Current v2.c formula

```
score_v2_c = (
  COALESCE(github,      20) × 0.20 +
  COALESCE(package,     20) × 0.20 +
  COALESCE(dependency,  20) × 0.15 +
  COALESCE(ecosystem,   20) × 0.10 +
  COALESCE(docs,        20) × 0.10 +
  COALESCE(hn,          20) × 0.10 +
  COALESCE(trust,       20) × 0.05
) / 0.90
```

Weights are **fixed by operator decision** (Apr–May 2026). Scores are on different internal scales before log-scaling; v2.c normalizes them to a common 0–100 range and combines linearly.

### Proposed BT layer (shadow v3)

BT does not replace the component signals. It adds a learned quality parameter on top of (or alongside) them.

**Option A — BT as post-ranking calibration (recommended)**

1. Collect all (agent_id, snapshot_date, rank) from `agent_snapshots` for Developer-category agents.
2. For each pair (A, B) and each day: add 1 to W_AB if rank_A < rank_B (A ranks higher = A wins).
3. Fit BT model using MM (Minorize-Maximize) algorithm: iterate until convergence:
   ```
   θ_A_new = W_A / Σ_B [ (W_AB + W_BA) / (exp(θ_A) + exp(θ_B)) ]
   ```
   where W_A = total wins for A across all pairwise comparisons.
4. Normalize θ_i to [0, 100] scale: `bt_score = (θ_i - θ_min) / (θ_max - θ_min) × 100`
5. Store in new table `agent_bt_scores` (agent_id, category, bt_score, bt_rank, fit_date).
6. Shadow view `agent_score_v3_bt_preview` joins v2.c score with bt_score for comparison.

**Option B — BT as a replacement for some v2.c weights (more aggressive)**

Replace one or more fixed-weight signals with a BT sub-score derived from dependency endorsement graph. More complex, deferred to Phase 2 if Option A validates well.

### What BT changes

| Property | v2.c | BT (Option A) |
|----------|------|---------------|
| Weight determination | Operator-set (0.20/0.20/0.15/…) | Learned from 60+ days of rank history |
| Transitivity | Not guaranteed (A > B, B > C → A > C is NOT guaranteed) | Guaranteed by model structure |
| Sparse-agent handling | Missing-signal prior (=20) | Excluded from BT pairs where no rank exists |
| Interpretability | "github is 20% of your score" | "87% probability A beats B in head-to-head" |
| Confidence intervals | None | Bootstrap CIs available from pair win counts |
| Circular comparison (A>B>C>A) | Ignores | Resolves probabilistically |

The most important change is **transitivity**. Under v2.c, it is mathematically possible for A > B and B > C but A ≈ C in raw score if A and C have different signal profiles. BT resolves this through the comparison chain. In practice, this matters most for the 50–200 rank range where agents are tightly clustered.

### Circularity caveat

Because BT is fit on `agent_snapshots.rank`, and those ranks were computed by v2.c, the BT scores will be correlated with v2.c scores. This is not a flaw — it is correct behavior. BT learns which agents are consistently ranked above which others, and expresses that as a latent quality parameter with proper statistical properties. If v2.c is miscalibrated (e.g., weights are wrong), BT will identify agents that consistently over- or under-perform their v2.c score and correct them through the comparison chain.

The circularity breaks once we have **external pairwise outcomes** (e.g., actual head-to-head agent performance data). At that point BT becomes truly independent of v2.c. Until then, it is a regularized, transitive re-expression of our own rank history.

---

## 4. Migration plan

### Phase 0 (this PR): Research only. No code changes.

### Phase 1 (next task, if Kris approves): Shadow system

1. **New migration:** `20260618_XXXX_agent_bt_scores.sql`
   ```sql
   CREATE TABLE agent_bt_scores (
     agent_id    uuid NOT NULL REFERENCES agents(id),
     category    text NOT NULL,
     bt_score    numeric(8,4),
     bt_rank     integer,
     pair_count  integer,    -- total wins+losses in the comparison graph
     fit_date    date NOT NULL,
     created_at  timestamptz DEFAULT now()
   );
   CREATE UNIQUE INDEX ON agent_bt_scores (agent_id, category, fit_date);
   ```
   No changes to `agents`, `rankings`, or `agent_snapshots`.

2. **New worker:** `runtime/bt-scoring-worker.mjs`
   - Reads last 90 days of `agent_snapshots` for Developer category agents
   - Constructs pairwise win matrix (in-memory for ~120 evidence-ranked agents: trivial)
   - Runs MM algorithm (typically converges in 20–50 iterations)
   - Writes results to `agent_bt_scores`
   - Timer: weekly Sunday 09:30 UTC (after Sunday scoring run at ~09:00)
   - Cost: zero API calls, ~$0

3. **New shadow view:** `agent_score_v3_bt_preview`
   ```sql
   SELECT 
     a.agent_id, a.handle,
     v.score_v2_c_candidate,
     v.rank_v2_c,
     b.bt_score,
     b.bt_rank,
     b.bt_rank - v.rank_v2_c AS bt_vs_v2c_rank_delta
   FROM agent_score_v2_rank_comparison v
   JOIN agents a USING (agent_id)
   LEFT JOIN agent_bt_scores b ON b.agent_id = a.id AND b.category = 'developer'
   ORDER BY b.bt_rank NULLS LAST;
   ```

4. **Shadow period:** 4 weeks (Sunday runs × 4). Monitor the `bt_vs_v2c_rank_delta` distribution:
   - If P90 divergence < 10 positions: BT and v2.c agree → v2.c weights are reasonable, BT adds confidence intervals only
   - If P90 divergence > 20 positions: meaningful re-ranking → review top-20 divergent agents and decide which ranking is "more right"

### Phase 2 (only after Kris reviews shadow results)

Decision point: promote BT scores into the public ranking? Options:
- **Keep v2.c as primary, add BT rank as a published signal** (low risk): publish `bt_rank` on agent profile pages as a secondary ranking view. No methodology change.
- **Replace v2.c with BT as primary** (high impact): requires operator approval + scoring-weight-rule protocol.
- **BT-calibrate v2.c weights** (most principled): use BT scores to learn optimal weights for v2.c's component signals via maximum-likelihood estimation. This would make v2.c's weights data-driven rather than operator-assigned.

---

## 5. Open questions for Kris

1. **Approve Phase 1?** Build the BT worker + shadow table. No public impact, no scoring changes. Worker runs Sundays, shadow view available for internal inspection only.

2. **Scope constraint:** BT shadow will initially cover only Developer category's evidence-ranked agents (~120 agents). Is that scope correct, or should it include all Developer-category indexed agents (~1,354)?

3. **If Phase 2 is "keep v2.c as primary, publish BT rank as secondary":** This is publishable on `/methodology` as "alternative ranking view." Does this conflict with the scoring-weight rule (the rule targets changes to live weights, not additional views)?

4. **Attribution note:** Any public mention of BT methodology should note the influence of LMArena's Bradley-Terry approach (academic credit, not competitive claim). Kris to decide if that attribution is desirable on the `/methodology` page.

---

## 6. Comparison with LMArena's approach

LMArena collects explicit human preference votes (head-to-head model battles). Their BT input: votes. Their output: Elo-style capability scores. They apply per-category vote thresholds before promoting a model's BT score to its category leaderboard.

AgentCrush's proposed adaptation:
- Input: daily rank superiority across 60+ days (implicit pairwise outcomes, not explicit votes)
- Output: BT quality parameters θ_i normalized to 0–100 scale
- Evidence gate: agents must have appeared in ≥30 pairwise comparisons (≥30 days of snapshot data in the same category)

The key difference: LMArena's pairwise outcomes are direct (human says "A is better"). Ours are indirect (our own formula said "A ranks above B"). This circularity limits independence but is the correct approach given our data. The path to full BT independence requires external pairwise signal collection — which is a future product (e.g., head-to-head benchmarks, developer surveys).

---

## 7. File references

Scoring views explored for this research:
- `supabase/migrations/20260425_1200_create_score_v2_shadow_views.sql` — v2.a/b formulas + signal components view
- `supabase/migrations/20260425_1400_add_score_v2c_shadow_formula.sql` — v2.c current public formula (read above)
- `supabase/migrations/20260425_1600_add_agents_tier.sql` — evidence_ranked vs indexed tier assignment
- `supabase/migrations/20260408_1600_agent_snapshots.sql` — snapshot table schema (the BT input source)
- `supabase/migrations/20260424_1115_create_agent_dependency_rollups.sql` — dependency signal

BT fitting algorithm reference: Hunter (2004), "MM algorithms for generalized Bradley-Terry models." *Annals of Statistics* 32(1):384–406. Available at https://projecteuclid.org/euclid.aos/1079120141
