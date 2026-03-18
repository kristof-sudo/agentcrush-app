# AgentCrush Runtime

This folder is the GitHub-tracked source of truth for VPS worker code.

## Production runtime path
- /opt/agentcrush

## Rule
Do not treat direct edits in /opt/agentcrush as canonical except emergency fixes.
Normal workflow is:

task -> patch in repo -> commit -> deploy -> sync to /opt/agentcrush

## Not versioned here
- .env files
- node_modules
- offset/cache/state runtime files
- other ephemeral machine-local data
