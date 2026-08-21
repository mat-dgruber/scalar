# Scalar — Guia de Instruções do Agente de IA & Harness Gemini (GEMINI.md)

Este arquivo é o guia canônico de harness para o agente Gemini CLI trabalhando no monorepo Scalar.

---

## 🧭 1. Visão Geral da Arquitetura & Stack Monorepo

O Scalar é um monorepo de alta performance em Vue 3 + TypeScript para documentação e testes de APIs (`@scalar/api-reference`, `@scalar/api-client`, e mais de 40 pacotes de suporte e integrações).

- **Monorepo**: pnpm workspaces + orquestrador Turbo (`packages/*`, `integrations/*`, `projects/*`).
- **Frontend Core**: Vue 3 (Composition API, `<script setup lang="ts">`), Tailwind CSS.
- **Build System**: Vite 8 + Rolldown para pacotes Vue; `tsc` + `tsc-alias` para pacotes TypeScript puros.
- **Tooling**: Biome (lint & format TS/JS), ESLint (lint Vue), Prettier (format Vue, CSS, Markdown, JSON).
- **Testes**: Vitest para testes unitários; Playwright para testes E2E.

---

## 🕸️ 2. Navegação por Grafo de Conhecimento (Graph Engineering / Graphify)

Antes de executar varreduras com `grep` ou ler diretórios inteiros, SEMPRE consulte o Grafo de Conhecimento (`graphify`):

```bash
# 1. Busca contextual direcionada
graphify query "<pergunta_ou_conceito>"

# 2. Caminho de dependência e relacionamentos entre componentes
graphify path "<ComponenteA>" "<ComponenteB>"

# 3. Análise de impacto antes de refatorações
graphify affected "<simbolo_ou_modulo>"

# 4. Explicação semântica de nós e vizinhos
graphify explain "<conceito_ou_funcao>"
```

- **Atualização do Grafo**: Após modificar código, hooks em segundo plano disparam `graphify update .`.

---

## ⚡ 3. Comandos & Regras de Desenvolvimento

### Escopo de Pacotes (Crítico)
- **NUNCA** execute `pnpm test` na raiz para alterações em pacotes individuais (executa 40+ pacotes e é lento/ruidoso).
- Execute testes com escopo restrito ao pacote modificado:
  ```bash
  corepack pnpm vitest packages/<nome> --run
  corepack pnpm vitest integrations/<nome> --run
  ```

### Checagem de Tipos & Linting
- **Checagem de tipo**: `corepack pnpm --filter @scalar/<nome> types:check`
- **Lint TS/JS**: `corepack pnpm biome check --write <arquivos>`
- **Formatação Vue/CSS/MD**: `corepack pnpm prettier --write <arquivos>`

---

## 📦 4. Política de Changesets & SemVer

- Qualquer alteração em `packages/*`, `integrations/*` ou `projects/*` DEVE incluir um changeset.
- Verificar status: `corepack pnpm changeset status`
- Adicionar changeset: `corepack pnpm changeset`
  - Selecione `patch` para correções de bugs, melhorias de performance e refatores seguros.
  - Selecione `minor` para novas funcionalidades compatíveis.
  - Nunca selecione `major` sem validação arquitetural prévia.

---

## 🛡️ 5. Segurança Zero-Trust & Sandbox AI-Jail

- **Proteção de Segredos e PII**: Hooks BeforeTool bloqueiam deterministicamente o acesso a `.env*`, `.pem`, `.key`, `id_rsa`, `id_ed25519`, `credentials.json`.
- **Anti-XSS e Sanitização de SVG**: Qualquer conteúdo HTML, descrições Markdown de OpenAPI e ícones SVG dinâmicos devem passar por sanitização rígida (DOMPurify).
- **Proteção contra Timing Attacks**: Comparações criptográficas e tokens devem usar operações em tempo constante (`crypto.timingSafeEqual`).
- **Isolamento Sandbox**: Em ambientes compartilhados, execute o agente isolado via `.ai-jail` (`make jail-gemini`).

---

## 🧠 6. Sincronização Duo de Memória & Conventional Commits

- **Conventional Commits**: Formate os commits como `type(scope): subject` (ex: `feat(api-client): support new auth scheme`).
- **Sincronização de Memória**: Mantenha as memórias sincronizadas entre Gemini CLI e Claude Code executando `.claude/scripts/sync-claude-memory.sh` ou `make sync-memory`.
