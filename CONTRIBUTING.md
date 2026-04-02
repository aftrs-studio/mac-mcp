# Contributing

This project supports development with **Claude Code**, **Gemini CLI**, and **OpenAI Codex CLI**. Any provider can lead development.

## Development Setup

### 1. Clone and build

```bash
git clone https://github.com/hairglasses-studio/mac-mcp
cd mac-mcp
make build   # or: go build ./...
make test    # or: go test ./... -count=1
```

### 2. Verify

```bash
make pipeline-check   # build + vet + test (via shared pipeline)
```

Or use the pipeline script directly:

```bash
~/hairglasses-studio/dotfiles/scripts/hg-pipeline.sh
```

## Making Changes

1. Create a branch: `git checkout -b feat/my-change`
2. Make your changes
3. Run the pipeline: `make pipeline-check`
4. Commit with a descriptive message
5. Push and open a PR

## Code Style

- **Go**: `gofmt` formatting, `go vet` clean, golangci-lint passing
- **Node.js**: ESLint/Prettier where configured
- **Python**: ruff/black formatting

Editor settings are in `.editorconfig` — most editors pick this up automatically.

## Pre-commit Hooks

Install with:

```bash
make install-hooks
```

This runs vet + fast tests before each commit.

## CI

All PRs trigger CI automatically. The pipeline runs lint, test, and build checks.

## Questions?

Open an issue or tag `@hairglasses` in your PR.
