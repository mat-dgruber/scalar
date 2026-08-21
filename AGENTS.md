# Scalar — AI Agent Instructions & Harness Configuration (CLAUDE.md)

This file is the canonical harness guide for AI coding assistants working on the Scalar monorepo.

---

## 🧭 1. Architectural Overview & Monorepo Stack

Scalar is a high-performance Vue 3 + TypeScript monorepo for API documentation and testing tools (`@scalar/api-reference`, `@scalar/api-client`, and 40+ supporting packages and integrations).

- **Monorepo**: pnpm workspaces + Turbo orchestrator (`packages/*`, `integrations/*`, `projects/*`).
- **Frontend Core**: Vue 3 (Composition API, `<script setup lang="ts">`), Tailwind CSS.
- **Build System**: Vite 8 + Rolldown for Vue packages; `tsc` + `tsc-alias` for pure TypeScript packages.
- **Tooling**: Biome (TS/JS lint & format), ESLint (Vue lint), Prettier (Vue, CSS, Markdown, JSON format).
- **Testing**: Vitest for unit tests; Playwright for E2E tests.

---

## 🕸️ 2. Knowledge Graph First (Graph Engineering / Graphify)

Before scanning files with raw `grep` or reading entire directories into context, ALWAYS consult the Knowledge Graph (`graphify`):

```bash
# 1. Targeted question / context search
graphify query "<question>"

# 2. Relationship / shortest dependency path between components
graphify path "<ComponentA>" "<ComponentB>"

# 3. Impact analysis before refactoring
graphify affected "<symbol_or_module>"

# 4. Plain-language explanation of a node and its neighbors
graphify explain "<concept_or_function>"
```

- **Update Graph**: After modifying code, hooks trigger `graphify update .` in the background.

---

## ⚡ 3. Commands & Development Rules

### Package Scoping (Crucial)
- **NEVER** run root `pnpm test` for single-package changes (it runs 40+ packages and is slow/noisy).
- Run tests scoped to the modified package:
  ```bash
  corepack pnpm vitest packages/<name> --run
  corepack pnpm vitest integrations/<name> --run
  ```

### Type Checking & Linting
- **Type check affected package**: `corepack pnpm --filter @scalar/<name> types:check`
- **Lint TS/JS files**: `corepack pnpm biome check --write <files>`
- **Format Vue/CSS/MD files**: `corepack pnpm prettier --write <files>`

---

## 📦 4. Changesets & SemVer Policy

- Any change to `packages/*`, `integrations/*`, or `projects/*` MUST include a changeset.
- Check status: `corepack pnpm changeset status`
- Add changeset: `corepack pnpm changeset`
  - Select `patch` for bug fixes, performance improvements, and non-breaking refactors.
  - Select `minor` for new features and compatible additions.
  - Never select `major` without architectural sign-off.

---

## 🛡️ 5. Zero-Trust Security & AI Jail Sandbox

- **Secret & Credential Protection**: PreToolUse hooks deterministically block access to `.env*`, `.pem`, `.key`, `id_rsa`, `id_ed25519`, `credentials.json`.
- **Anti-XSS & SVG Sanitization**: All user-supplied Markdown, OpenAPI descriptions, and custom SVG icons must pass through DOMPurify / sanitization.
- **Timing Attack Resilience**: Cryptographic comparisons and auth tokens must use constant-time operations (`crypto.timingSafeEqual`).
- **AI-Jail Isolation**: In multi-tenant or untrusted environments, execute agents inside the `.ai-jail` sandbox (`make jail-openclaude`).

---

## 🤖 6. Subagents & Delegation

- `knowledge-graph-curator`: Maintains and queries the Knowledge Graph (`.claude/agents/knowledge-graph-curator.md`).
- `security-reviewer`: Adversarial reviewer for Zero-Trust compliance and vulnerability prevention (`.claude/agents/security-reviewer.md`).
- `verification`: Verifies builds, scoped tests, and linters before completing non-trivial tasks.

---

## 🧠 7. Memory Synchronization & Conventional Commits

- **Conventional Commits**: Format commits as `type(scope): subject` (e.g. `feat(api-client): support new auth scheme`, `fix(oas-utils): handle null responses`).
- **Memory Sync**: Synchronize persistent team memory across Claude Code and Gemini CLI via `.claude/scripts/sync-claude-memory.sh` or `make sync-memory`.
