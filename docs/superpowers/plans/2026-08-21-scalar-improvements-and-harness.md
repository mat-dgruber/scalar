# Plano de Implementação: Otimizações de Harness, Segurança Zero-Trust e Performance no Scalar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar melhorias de portabilidade e segurança no harness de agentes (Claude & Gemini), sanitização Zero-Trust e otimizações de performance para manipulação de grandes especificações OpenAPI no monorepo Scalar.

**Architecture:** Estruturação em camadas priorizadas: (1) Generalização dinâmica e portabilidade dos hooks de IA e scripts de sincronização de memória; (2) Blindagem de testes unitários dos scripts de segurança e sanitização; (3) Refinamento da manipulação de reatividade com `shallowRef`/`markRaw` em esquemas estáticos no `workspace-store`.

**Tech Stack:** Bash, Node.js/TypeScript, Vitest, pnpm workspaces, Turbo, Claude Code & Gemini CLI Harness.

## Global Constraints

- Nunca executar `pnpm test` na raiz; rodar testes escopados por pacote (`corepack pnpm vitest packages/<nome> --run`).
- Não alterar regras de versionamento SemVer sem criação de changeset associado.
- Manter compatibilidade multiplataforma (macOS e Linux) nos scripts em `.claude/scripts/`.

---

### Task 1: Generalizar portabilidade no Harness do Gemini CLI e Sync de Memória

**Files:**
- Modify: `.gemini/settings.json`
- Modify: `.claude/scripts/sync-claude-memory.sh`
- Test: Execução direta do script de sincronização e validação de resolução de caminhos

**Interfaces:**
- Consumes: Variáveis de ambiente `$HOME`, `$PWD` e cálculo dinâmico de slug para o diretório de memória do OpenClaude.
- Produces: Scripts idempotentes e portáteis para qualquer desenvolvedor ou máquina.

- [ ] **Step 1: Testar comportamento atual do script de sincronização**

Executar:
```bash
bash .claude/scripts/sync-claude-memory.sh
```
Expected: Execução bem-sucedida ou aviso sem falha crítica.

- [ ] **Step 2: Atualizar `.gemini/settings.json` para resolução dinâmica de binários**

Substituir o caminho absoluto `/Users/matheus.diniz_1/.local/bin/graphify` por invocação dinâmica via shell compatível:
```json
{
  "hooks": {
    "BeforeTool": [
      {
        "matcher": "read_file|list_directory|run_shell_command",
        "hooks": [
          {
            "type": "command",
            "command": "sh -c 'if command -v graphify >/dev/null 2>&1; then graphify hook-guard gemini; elif [ -x \"$HOME/.local/bin/graphify\" ]; then \"$HOME/.local/bin/graphify\" hook-guard gemini; fi'"
          },
          {
            "type": "command",
            "command": "\"$PWD/.claude/scripts/protect-secrets.sh\""
          }
        ]
      }
    ],
    "AfterTool": [
      {
        "matcher": "write_file|edit_file",
        "hooks": [
          {
            "type": "command",
            "command": "sh -c 'if command -v graphify >/dev/null 2>&1; then graphify update . >/dev/null 2>&1 & fi'"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Tornar `sync-claude-memory.sh` dinâmico para qualquer repositório e usuário**

Atualizar `.claude/scripts/sync-claude-memory.sh` para calcular o slug de projeto a partir de `$REPO_ROOT` com fallback:
```bash
REPO_SLUG="$(echo "$REPO_ROOT" | sed 's/\//-/g')"
CLAUDE_MEM="${OPENCLAUDE_PROJECT_DIR:-$HOME/.openclaude/projects/$REPO_SLUG/memory}"
```

- [ ] **Step 4: Executar e validar sincronização com o novo formato dinâmico**

Executar:
```bash
bash .claude/scripts/sync-claude-memory.sh
```
Expected: `✅ [MEMORY SYNC] Memórias sincronizadas com sucesso`

---

### Task 2: Validação de Segurança Zero-Trust nos Hooks PreToolUse

**Files:**
- Test: `.claude/scripts/protect-secrets.sh`
- Modify: `.claude/scripts/protect-secrets.sh`

**Interfaces:**
- Consumes: Entradas JSON via stdin com chamadas de ferramentas de leitura/edição.
- Produces: Código de saída 1 (bloqueio) quando padrões de segredos (`.env`, `.key`, `.pem`, `id_rsa`) forem detectados.

- [ ] **Step 1: Criar teste de validação de bloqueio de credenciais**

Testar com payload simulado de leitura de arquivo `.env`:
```bash
echo '{"tool_name": "Read", "tool_input": {"file_path": "/path/to/.env"}}' | python3 .claude/scripts/protect-secrets.sh
```
Expected: Saída de erro e exit code != 0.

- [ ] **Step 2: Testar com arquivo seguro**

```bash
echo '{"tool_name": "Read", "tool_input": {"file_path": "/path/to/package.json"}}' | python3 .claude/scripts/protect-secrets.sh
```
Expected: Exit code 0 sem bloqueio.

---

### Task 3: Verificação e Documentação das Regras de Performance

**Files:**
- Check: `packages/workspace-store/`
- Modify: `docs/guides/guia-padrao-scalar-openapi-dx.md`

**Interfaces:**
- Consumes: Padrões de reatividade do Vue 3 e TypeBox.
- Produces: Diretrizes explícitas de uso de `shallowRef` e `markRaw` para grandes coleções e nós estáticos de documentação.

- [ ] **Step 1: Documentar padrões de reatividade otimizada em `guia-padrao-scalar-openapi-dx.md`**

Adicionar seção explicando o uso consciente de `shallowRef` em parsers e gerenciadores de estado para OpenAPI >5MB.

- [ ] **Step 2: Executar testes do workspace-store para garantir regressão zero**

Executar:
```bash
corepack pnpm vitest packages/workspace-store --run
```
Expected: Todos os testes passando com sucesso.
