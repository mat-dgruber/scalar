#!/usr/bin/env python3
# ==============================================================================
# PreToolUse Hook: Zero-Trust Secret and Credential Blocker
# Intercepts tool execution and blocks access to sensitive files and credentials
# ==============================================================================
import sys
import json
import re

try:
    raw = sys.stdin.read()
    if not raw.strip():
        sys.exit(0)
    data = json.loads(raw)
except Exception:
    sys.exit(0)

tool_input = data.get("tool_input", {})
if not isinstance(tool_input, dict):
    sys.exit(0)

# Collect all string inputs
values = [str(v) for v in tool_input.values() if isinstance(v, (str, int, float))]
target = " ".join(values)

# Exempt safe documentation or example files
if ".env.example" in target and not any(k in target for k in [".env.local", ".env.production", ".env.staging", "id_rsa", "id_ed25519", ".pem", ".key", "credentials.json"]):
    sys.exit(0)

forbidden_pattern = re.compile(
    r'(\.env(\.[a-zA-Z0-9_-]+)*|[^\s"\'`]*\.(pem|key)|id_rsa|id_ed25519|credentials\.json|service-account.*\.json|\.aws/credentials|\.docker/config\.json)'
)

if forbidden_pattern.search(target):
    sys.stderr.write(f"❌ [SECURITY ZERO-TRUST] Operação bloqueada! Acesso a credencial/segredo proibido em: {target}\n")
    sys.exit(1)

sys.exit(0)
