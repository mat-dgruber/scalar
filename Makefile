# ==============================================================================
# Scalar Monorepo — AI Harness & Operational Automation Makefile
# ==============================================================================

.PHONY: help setup graph graph-query jail-setup jail-openclaude jail-gemini sync-memory format lint typecheck changeset changeset-status

help:
	@echo "Scalar Harness Automation:"
	@echo "  make setup            - Install dependencies, build packages and setup AI hooks"
	@echo "  make graph            - Build/update Knowledge Graph (Graphify)"
	@echo "  make sync-memory      - Synchronize agent memories across Claude & Gemini"
	@echo "  make jail-openclaude  - Launch OpenClaude inside ai-jail sandbox"
	@echo "  make jail-gemini      - Launch Gemini CLI inside ai-jail sandbox"
	@echo "  make format           - Format TS/JS/Vue/Markdown files"
	@echo "  make lint             - Run Biome and ESLint linters"
	@echo "  make typecheck        - Typecheck TypeScript and Vue packages"
	@echo "  make changeset        - Create a new changeset for package releases"

setup:
	corepack pnpm install
	corepack pnpm build:packages
	chmod +x .claude/scripts/*.sh
	graphify install --platform claude || true
	graphify install --platform gemini || true

graph:
	graphify extract . || true
	graphify update . || true

sync-memory:
	bash .claude/scripts/sync-claude-memory.sh

jail-setup:
	@command -v ai-jail >/dev/null 2>&1 || (echo "Install ai-jail: brew install akitaonrails/tap/ai-jail" && exit 1)
	ai-jail --clean --init

jail-openclaude:
	ai-jail openclaude

jail-gemini:
	ai-jail gemini

format:
	corepack pnpm format

lint:
	corepack pnpm lint:check

typecheck:
	corepack pnpm types:check

changeset:
	npx @changesets/cli

changeset-status:
	npx @changesets/cli status
