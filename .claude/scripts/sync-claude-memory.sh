#!/bin/bash
# ==============================================================================
# Sincronização Duo de Memória (Claude Code <-> Gemini CLI <-> Shared Agents)
# ==============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO_SLUG="$(echo "$REPO_ROOT" | sed 's/\//-/g')"
CLAUDE_MEM="${OPENCLAUDE_PROJECT_DIR:-$HOME/.openclaude/projects/$REPO_SLUG/memory}"
SHARED_MEM="$REPO_ROOT/.agents/memory"
GEMINI_MEM="$REPO_ROOT/.gemini/memory"

mkdir -p "$SHARED_MEM/team" "$GEMINI_MEM"

# 1. Sync from local openclaude team memory to shared repo memory
if [ -d "$CLAUDE_MEM/team" ]; then
  rsync -av --update "$CLAUDE_MEM/team/" "$SHARED_MEM/team/" 2>/dev/null || true
fi

# 2. Sync shared team memory to Gemini memory
if [ -d "$SHARED_MEM/team" ]; then
  rsync -av --update "$SHARED_MEM/team/" "$GEMINI_MEM/" 2>/dev/null || true
fi

# 3. Pull updates back to local openclaude team memory
if [ -d "$SHARED_MEM/team" ] && [ -d "$CLAUDE_MEM/team" ]; then
  rsync -av --update "$SHARED_MEM/team/" "$CLAUDE_MEM/team/" 2>/dev/null || true
fi

echo "✅ [MEMORY SYNC] Memórias sincronizadas com sucesso entre Claude Code, Gemini CLI e .agents/memory/"
