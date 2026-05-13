# Audit primitives

Each primitive is a focused, evidence-producing check. The current set is
sourced from the AgentCrush Field Lab (`agentcrush-field-lab/`). Labs Offer 1
bundles all 7.

| # | Primitive | Source lab | Status |
|---|---|---|---|
| 1 | `default_judge_model_disclosure` | Lab 14 (evals & observability) | ✅ implemented |
| 2 | `framework_hardcoded_default_model` | Lab 7 | ⏳ not implemented |
| 3 | `protocol_validation_strictness` | Lab 8 | ⏳ not implemented |
| 4 | `credential_cap` + `self_payment_guard` | Lab 11 | ⏳ not implemented |
| 5 | `dom_action_validation_strictness` + `pause_on_login` | Lab 12 | ⏳ not implemented |
| 6 | 3-default-model-cost audit + `audio_prompt_injection_defense` | Lab 13 | ⏳ not implemented |
| 7 | `bot_fetch_friendliness` | Lab 15 | ⏳ not implemented |

## `default_judge_model_disclosure`

**What it checks:** for a project that uses an LLM-as-judge / LLM-grader
pattern in its eval surface, is the *default judge model* disclosed to the
user (via docs or a configurable surface) or is it silently hardcoded?

**Status enum:**

- `disclosed` — judge model is documented in README/docs, or read from an
  env var / config field with a clear user-facing override path.
- `partial` — judge model is referenced in code with a hardcoded default,
  but at least one of: (a) the default constant is named and adjacent to a
  comment pointing users at an override, (b) the project surfaces a config
  knob for it. (Braintrust Autoevals' canonical case.)
- `undisclosed` — judge model is used internally with no user-facing config
  and no documentation.
- `not_applicable` — no LLM-as-judge usage detected in the source tree.

**Inputs:** GitHub repo URL or local path.

**Output:** JSON `{primitive, target, status, evidence[], notes}` plus a
markdown report fragment.

**Field-lab origin:** Lab 14 (`agentcrush-field-lab/14-evals-observability/field-report.md`).
The canonical positive case is `braintrustdata/autoevals` — see
`autoevals/py/autoevals/llm.py` (`DEFAULT_MODEL = "..."`). At the time of
Lab 14 (May 2026) this was line 82; in the current `main` it is around
line 91 — the primitive locates it dynamically, not by line number.
