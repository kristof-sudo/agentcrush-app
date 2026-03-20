# Canonical Deploy Wrapper

This repo now has one canonical local entrypoint:

```bash
./ops/deploy-and-smoke.sh
```

That wrapper performs:

1. local diff review
2. local validation
3. gated deploy
4. post-deploy check

## Approval gate

The wrapper intentionally stops after review and validation unless you rerun it with:

```bash
./ops/deploy-and-smoke.sh --approve-deploy
```

This keeps founder approval in the loop.

## Remote execution model

Deployment and post-check both route through the bounded remote executor already named in `AGENTS.md`:

- `/root/agentcrush-app/tools/agentcrush-exec.py`

Configure the concrete host and bounded subcommands in:

```bash
ops/deploy/prod.env
```

Start from:

```bash
cp ops/deploy/prod.env.example ops/deploy/prod.env
```

The wrapper does not assume a broad remote shell workflow.
