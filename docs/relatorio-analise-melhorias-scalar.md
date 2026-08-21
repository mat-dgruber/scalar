# Relatório de Diagnóstico, Otimizações e Evolução Arquitetural — Monorepo Scalar

> **Data:** 21 de Agosto de 2026  
> **Escopo:** Análise arquitetural, harness de IA (Claude & Gemini), performance, segurança Zero-Trust, novas funcionalidades e DX no monorepo Scalar.

---

## 1. Sumário Executivo

O monorepo **Scalar** é uma infraestrutura de alto desempenho para documentação interativa, testes e orquestração de APIs HTTP/REST/SSE e OpenAPI 3.0/3.1 / AsyncAPI. Estruturado com **pnpm workspaces (v10)** e **Turborepo (v2)**, o ecossistema engloba mais de 40 pacotes modulares (`packages/*`), 12+ integrações com frameworks web (`integrations/*`) e aplicações de produção (`projects/*`).

Com a recente atualização do **Harness de IA** (incorporando Claude Code, Gemini CLI, Knowledge Graph via Graphify, AI Jail Sandboxing e scripts de proteção de segredos), o ambiente está preparado para operações autônomas e colaborativas de alta fidelidade. Este relatório identifica pontos críticos, oportunidades de otimização de performance, extensões funcionais (como servidores MCP nativos e visualizador SSE/WS) e blindagem de segurança Zero-Trust.

---

## 2. Diagnóstico da Arquitetura & Monorepo

### 2.1 Estrutura em Camadas
```
scalar/
├── packages/                  # 43 pacotes modulares (Vue 3, TypeScript puro, utilitários)
│   ├── api-reference/         # Renderizador de documentação interativa OpenAPI/AsyncAPI
│   ├── api-client/            # Cliente HTTP/SSE com layouts web/modal/app
│   ├── workspace-store/       # Estado reativo unificado (Vue Reactivity + TypeBox)
│   ├── openapi-parser/        # Parser e desreferenciador de alta velocidade
│   ├── agent-chat/            # Interface de chat assistido por IA (Vercel AI SDK + Gemini)
│   └── mock-server/           # Servidor mock HTTP dinâmico baseado em Hono e Faker
├── integrations/              # Adaptadores para Express, Fastify, NestJS, Hono, Next.js, Nuxt, etc.
├── projects/                  # Aplicações de produção (scalar-app, galaxy, proxies)
└── tooling/                   # Scripts de release, lint e gerador customizado de changelogs
```

### 2.2 Pontos Fortes Identificados
- **Catalogação Unificada**: Uso de catálogos pnpm (`catalog:`) garantindo paridade de versões entre pacotes para dependências críticas (`vue`, `vite`, `typescript`, `@types/node`).
- **Validação Tipada em Tempo de Execução**: Substituição progressiva de validações lentas por `@sinclair/typebox`, gerando esquemas JSON Schema compilados e eficientes.
- **Renderização Lazy em Documentações**: Componente `Lazy.vue` acoplado ao `IntersectionObserver` reduz a montagem inicial do DOM para documentos com centenas de rotas.

### 2.3 Gaps Arquiteturais & Oportunidades
1. **Sobrecarga de Reatividade no `workspace-store`**:
   - *Diagnóstico*: Documentos OpenAPI gigantescos (>5MB / milhares de esquemas) são convertidos integralmente em proxies reativos profundos (`reactive` / `ref`).
   - *Impacto*: Alocação excessiva de memória heap e pressão no Garbage Collector em navegadores com recursos limitados.
   - *Recomendação*: Isolar esquemas estáticos usando `shallowRef()` e `markRaw()` para árvores de nós imutáveis.

2. **Parsing Síncrono de OpenAPI na Thread Principal**:
   - *Diagnóstico*: O `@scalar/openapi-parser` realiza desreferenciação (`$ref`) na thread principal da UI.
   - *Recomendação*: Disponibilizar um worker assíncrono (`createWorkerParser`) transferindo estruturas serializadas sem travar o frame rate da interface.

---

## 3. Harness de IA, Tooling & Práticas Operacionais

### 3.1 Estado Atual do Harness
- **Governança Canônica**: Regras centralizadas em `AGENTS.md` e `GEMINI.md`.
- **PreToolUse / PostToolUse Hooks**:
  - `protect-secrets.sh`: Bloqueia acesso a arquivos de credenciais (`.env*`, `.pem`, `.key`, `id_rsa`).
  - `verify-semver.sh`: Valida a presença de arquivos de changeset antes de comandos de release.
  - Auto-formatação com Biome e Prettier no pós-processamento de edições.
- **Knowledge Graph (Graphify)**:
  - Subagente especializado `knowledge-graph-curator` para consultas de impacto estrutural (`graphify affected <symbol>`) e caminhos entre módulos (`graphify path <A> <B>`).
- **Isolamento com AI-Jail**:
  - Sandboxing operacional montando apenas caminhos seguros como Read-Write (`~/.openclaude`, `~/.cache`, `~/.npm`, `~/.pnpm-state`) e credenciais de SSH/Git como Read-Only.

### 3.2 Otimizações Recomendadas para o Harness
1. **Portabilidade de Caminhos**:
   - *Problema*: Referências a caminhos absolutos locais em `.gemini/settings.json` e `sync-claude-memory.sh` (ex: `/Users/matheus.diniz_1/...`).
   - *Ação*: Substituir por `$HOME` ou variáveis de ambiente configuráveis (`OPENCLAUDE_PROJECT_DIR`).
2. **Hook de Mudança de Esquema (Schema Validation Guard)**:
   - Adicionar verificação estática prévia para alterações em esquemas TypeBox compartilhados entre pacotes, evitando quebras silenciosas em monorepos multi-versão.

---

## 4. Novas Funcionalidades e Integrações Estratégicas

### 4.1 Servidor MCP (Model Context Protocol) Nativo do Scalar
- **Conceito**: Criar um pacote `@scalar/mcp-server` ou integrar ao `@scalar/cli` e `@scalar/mock-server`.
- **Funcionamento**:
  - Lê qualquer especificação OpenAPI local ou remota.
  - Converte cada `operationId` em uma `tool` MCP padronizada com validação de parâmetros.
  - Permite que ferramentas de IA (Claude Code, Cursor, Windsurf, Claude Desktop) descubram, consultem e executem chamadas contra APIs documentadas no Scalar em tempo real via `stdio` ou `SSE`.

### 4.2 Visualizador Avançado de Streaming (SSE & WebSockets)
- **Localização**: `@scalar/api-client`
- **Funcionalidades Propostas**:
  - Timeline de eventos recebidos em tempo real para respostas `text/event-stream`.
  - Filtro por tipo de evento (`event: custom-event`), busca de texto em payloads e exibição de latência por frame.
  - Suporte completo a WebSockets bidirecionais com histórico de mensagens enviadas e recebidas.

### 4.3 Suporte Multimodal & Auto-Heal no `agent-chat` (Gemini)
- **Localização**: `@scalar/agent-chat/src/transports/gemini-chat-transport.ts`
- **Melhorias**:
  - Capacidade de anexar arquivos de esquemas, cURLs e exemplos diretamente ao prompt do agente.
  - Mecanismo de *Auto-Heal* em chamadas de ferramenta: se o modelo emitir parâmetros que falham na validação do esquema OpenAPI, o transporte reenvia o erro ao LLM com instruções corretivas imediatas.

---

## 5. Segurança Zero-Trust & Conformidade

| Vetor de Risco | Estado Atual | Plano de Ação Recomendado |
|---|---|---|
| **XSS em Markdown / OpenAPI** | URLs sanitizadas via `is-safe-url.ts` | Aplicar DOMPurify estrito com perfil de remoção de scripts e sanitização de tags SVG (`onload`, `xlink:href`) em todo conteúdo dinâmico. |
| **Scripts Pre/Post Request** | Executados no contexto da aplicação | Isolar a execução de scripts customizados em Web Workers dedicados ou sandboxes WebAssembly (QuickJS-WASM) sem acesso a cookies/localStorage. |
| **Timing Attacks em Mocks** | Comparações simples de strings | Utilizar `crypto.timingSafeEqual` para validações de chaves de API, tokens Bearer e assinaturas de webhook no `@scalar/mock-server`. |
| **Vazamento de Credenciais** | Protegido por hook PreToolUse | Manter regra Zero-Trust e auditar headers de requisição no `@scalar/api-client` para mascarar valores sensíveis em logs/telemetria. |

---

## 6. Experiência do Desenvolvedor (DX) & Fluxo de Testes

1. **Testes Escopados Obrigatórios**:
   - Manter a regra de nunca executar o `pnpm test` global durante o ciclo de desenvolvimento iterativo:
     ```bash
     corepack pnpm vitest packages/api-reference --run
     corepack pnpm vitest packages/workspace-store --run
     ```
2. **Validação Automatizada de Changesets**:
   - Integrar no pipeline de CI a checagem automática de changesets para PRs que afetem `packages/*` ou `integrations/*`.
3. **Sincronização Bidirecional de Memória**:
   - Utilizar `make sync-memory` regularmente para alinhar contextos aprendidos entre sessões de trabalho locais e agentes distribuídos.

---

## 7. Roadmap de Execução Sugerido

```
[Fase 1: Estabilidade & Segurança]
  ├── Generalização de caminhos no harness (.gemini e scripts)
  ├── Isolamento de scripts pre/post request com Web Worker / QuickJS
  └── Blindagem de sanitização DOMPurify para SVGs/Markdown externos

[Fase 2: Performance Core]
  ├── Aplicação de shallowRef / markRaw no workspace-store
  └── Implementação de Web Worker para parsing assíncrono de OpenAPI

[Fase 3: Novas Funcionalidades de IA & Client]
  ├── Servidor MCP nativo (@scalar/mcp-server)
  ├── Visualizador de SSE / WebSocket no api-client
  └── Resolução adaptativa e multimodal no agent-chat com Gemini
```
