#!/bin/bash
# ==============================================================================
# PreToolUse Hook: Changeset and SemVer Verification for Scalar Monorepo
# Checks that modifications to packages/, integrations/, or projects/ include changesets
# ==============================================================================

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

if echo "$command" | grep -Eq '(gh pr create|git push)'; then
  CHANGED_PKGS=$(git diff --name-only HEAD~1 2>/dev/null | grep -E '^(packages|integrations|projects)/' || true)
  if [ -n "$CHANGED_PKGS" ]; then
    NEW_CHANGESET=$(git diff --name-only HEAD~1 2>/dev/null | grep -E '^\.changeset/[^/]+\.md$' || true)
    if [ -z "$NEW_CHANGESET" ]; then
      echo "⚠️ [SEMVER/CHANGESET WARNING] Foram modificados pacotes sem inclusão de changeset!" >&2
      echo "💡 Dica: Execute 'pnpm changeset' para criar um changeset (patch ou minor)." >&2
    fi
  fi
fi

exit 0
