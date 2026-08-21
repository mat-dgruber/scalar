

# Guia de Integração Graph Engineering para MonFinTrack

## Diagnóstico do Repositório

O repositório `CCAT-monFinTrack` possui uma infraestrutura de agentes de IA dupla e madura: uma trilha para **Claude Code** (`.claude/`) e outra para **Gemini CLI** (`.gemini/`), além de uma camada agnóstica de regras em `.agents/rules/`. O projeto é composto por um backend FastAPI + Google Firestore e um frontend Angular 20, com arquitetura documentada em `ARCHITECTURE.md` e schema em `FIRESTORE_SCHEMA.md`. Este guia habilita um **knowledge graph operacional e consultável** que a IA pode indexar e navegar automaticamente durante o desenvolvimento.

O arquivo `CLAUDE.md` confirma que o projeto usa **hooks** (`PreToolUse`/`PostToolUse`), **skills locais** (`graphify`, etc.) e subagentes (`knowledge-graph-curator`, `verification`). O Gemini CLI do projeto interage com a mesma estrutura de grafos via `.gemini/settings.json` e o script de sincronização de memórias `./.claude/sync-claude-memory.sh`.

## Escolha da Ferramenta de Graph Engineering

Entre as soluções mais bem avaliadas e padronizadas do ecossistema para transformar um repositório em um grafo de conhecimento navegável por agentes de IA, três se destacam por maturidade, adoção e suporte nativo a plugins/skills tanto em Claude Code quanto em Gemini CLI:

| Ferramenta                                 | Tipo de integração                                                                                       | Estrelas/adoção                                                                                     | Pontos fortes                                                                                                                                          | Observação                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Graphify** (`graphifyy` no PyPI) | Skill nativa (`/graphify`) instalável via CLI `graphify install --platform claude/gemini>`             | Referenciada como líder no nicho, com relatos de até 70x de economia de tokens em bases grandes[^1] | Suporta 20+ assistentes incl. Claude Code e Gemini CLI, gera`graph.html`, `graph.json`, `GRAPH_REPORT.md`, com MCP server opcional               | Ideal para repositórios com muitos arquivos |
| **code-review-graph** (CRG)          | MCP server + skill, auto-configuração via CLI`code-review-graph install --platform claude-code/gemini` | ~25 ferramentas MCP, benchmarks públicos                                                             | SQLite/AST local, blast-radius analysis, prompts MCP prontos (`architecture_map`, `onboard_developer`)                                             | Foco mais forte em code review e impacto de mudanças[^2][^3][^4]                                            |
| **Understand Anything**              | Plugin nativo via marketplace do Claude Code +`install.sh gemini` para Gemini CLI                        | 76,3k estrelas, 6,4k forks[^5]                                                                        | Dashboard visual interativo, tours guiados, mapeamento de domínio de negócio (`/understand-domain`), compartilhável em equipe via `.ua/` no git | Melhor opção quando o objetivo é onboarding/documentação visual, não apenas navegação por tokens     |

Para o `MonFinTrack`, a recomendação oficial é usar o **Graphify** como camada principal de graph engineering técnico (código) por ser a opção com instalação mais padronizada e simétrica entre Claude Code e Gemini CLI via CLI.

## Passo a Passo — Claude Code

### 1. Pré-requisitos

- Ter o Claude Code instalado e autenticado (`claude` no terminal).
- Ter `uv` disponível (o projeto já depende de `uv` como gerenciador de pacotes Python, conforme `README.md`).
- Clonar e abrir o repositório: `git clone <url> && cd CCAT-monFinTrack`.

### 2. Instalar o Graphify como skill nativa

```bash
# Instala o pacote CLI (nome do pacote no PyPI é graphifyy, com dois "y")
uv tool install graphifyy

# Registra a skill no Claude Code, com escopo de projeto (recomendado para
# manter a skill versionada dentro do repo, em .claude/skills/graphify/)
graphify install --project --platform claude
```

Isso cria `.claude/skills/graphify/SKILL.md` mais um sidecar `references/`, exatamente no mesmo padrão de skills já usado pelo projeto (`.claude/skills/create-migration/`, `.claude/skills/gen-route-test/`).[^7]

### 3. Gerar o grafo de conhecimento do repositório

Dentro do Claude Code, execute:

```
/graphify .
```

O comando escaneia todo o projeto (`src/app/{modulo}/`, `docs/adrs/`, `docs/domains/`) e gera:

- `graph.html` — visualização interativa,
- `GRAPH_REPORT.md` — nós centrais, anomalias, perguntas sugeridas,
- `graph.json` — grafo persistente e consultável.[^8]

Como o projeto segue DDD com Vertical Slicing, o grafo vai naturalmente evidenciar os módulos mais "centrais" (ex.: `core/unit_of_work.py`, `models_registry.py`) como hubs de alta conectividade, já que todos os módulos de domínio dependem deles.

### 4. Complementar com o subagente de conhecimento (opcional, alta recomendação)

Como o projeto já mantém memória arquitetural em `.claude/memory/team/` (visto no arquivo sobre a "Knowledge Graph Engine" do OpenClaude), crie/atualize um subagente dedicado em `.claude/agents/knowledge-graph-curator.md`, seguindo o mesmo padrão do subagente `migration-verifier.md` já existente, para que, após alterações estruturais, o agente atualize o grafo:

```markdown
---
name: knowledge-graph-curator
description: Mantém o grafo de conhecimento do repositório (via Graphify) sincronizado após mudanças arquiteturais relevantes.
---
Sempre que uma ADR for criada ou um módulo de domínio for adicionado/alterado
em src/app/{modulo}/, execute `/graphify .` novamente e registre no
CHANGELOG.md/ADR correspondente que o grafo foi atualizado.
```

### 5. Automatizar via hook (para manter o grafo sempre atualizado)

Adicione ao `.claude/settings.json` (que já possui hooks `PreToolUse`/`PostToolUse`) um hook `PostToolUse` adicional restrito a alterações em `src/app/**/models.py` ou `docs/adrs/**`, disparando `graphify . --incremental` (o modo incremental só reanalisa arquivos alterados, evitando custo de token repetido).[^1][^8]

### 6. Consultar o grafo durante o desenvolvimento

```
/graphify query "quais módulos dependem de UnitOfWork?"
/graphify explain src/app/escola/service.py
```

Isso reduz drasticamente a necessidade de o Claude Code reler todo o código-fonte para se orientar, o que é especialmente relevante dado o volume de módulos de domínio já mapeado no `README.md` (10 módulos vertical-sliced).

### 7. Versionamento em equipe

Adicione ao `.gitignore` apenas os artefatos intermediários (cache), e comite `graph.json`/`GRAPH_REPORT.md` para que outros membros da equipe CPB Digital não precisem reconstruir o grafo do zero — alinhado à prática recomendada pelo próprio Graphify de "gerar uma vez, compartilhar via git".[^9][^6]

## Passo a Passo — Gemini CLI

O Gemini CLI deste projeto já vem com uma engine de knowledge graph embutida (`/knowledge`), então o setup aqui tem duas frentes complementares: (a) ativar/configurar a engine nativa e (b) instalar o Graphify como skill equivalente para consistência com o Claude Code.

### 1. Pré-requisitos

- Gemini CLI instalado (`gemini`), autenticado no projeto Google Cloud correspondente.
- `uv` disponível, como no fluxo do Claude Code.

### 2. Ativar a Knowledge Graph Engine nativa do Gemini CLI

No `.gemini/settings.json` do projeto, o bloco `experimental` já contempla `"autoMemory": true` e `"contextManagement": true`. Para garantir que a engine de grafo esteja persistentemente habilitada, execute dentro de uma sessão do Gemini CLI:

```
/knowledge enable yes
```

Isso ativa `knowledgeGraphEnabled` de forma persistente e global, permitindo que a engine extraia entidades técnicas automaticamente (`graph.entities`) durante a sessão de chat, conforme documentado no próprio arquivo de memória do time (`openclaude_knowledge_command.md`).

### 3. Sincronizar a memória local do projeto

O repositório já traz o script `.gemini/sync-memory.sh` e os alvos do `Makefile`:

```bash
make setup-gemini-hook   # instala o git pre-commit hook de sync automático
make pull-memory         # traz o grafo/memória global do Gemini para .gemini/memory/
```

Esse hook garante que, a cada commit, o grafo de conhecimento construído durante as sessões seja persistido em `.gemini/memory/` e versionado no git — sem tocar no diretório global do usuário, conforme a regra explícita do `GEMINI.md` ("Estes arquivos devem ser salvos EXCLUSIVAMENTE na pasta local do projeto `.gemini/`").

### 4. Instalar o Graphify como skill do Gemini CLI (para paridade com Claude Code)

```bash
uv tool install graphifyy   # se ainda não instalado na etapa do Claude Code
graphify install --project --platform gemini
```

Isso cria a skill equivalente em `.gemini/skills/graphify/` (o diretório `.gemini/skills/` já existe no projeto, hoje vazio, pronto para receber skills).[^6][^7]

### 5. Gerar o grafo dentro do Gemini CLI

```
/graphify .
```

Os mesmos três artefatos (`graph.html`, `graph.json`, `GRAPH_REPORT.md`) são gerados, permitindo que tanto Claude Code quanto Gemini CLI consultem o **mesmo grafo compartilhado** — um ponto forte de usar a mesma ferramenta nas duas trilhas, evitando divergência de "visão de mundo" entre os dois agentes que já colaboram neste repositório (como evidenciado pelas skills equivalentes documentadas em `.agents/skills/docs/users/gemini-cli-skills.md`, que já referenciam skills como `langgraph` e `mcp-builder`).

### 6. Consultar o `/knowledge` nativo em paralelo

Durante o desenvolvimento, use os subcomandos nativos para acompanhar o progresso semântico da sessão (goals, milestones, fatos técnicos), independentemente do grafo estrutural do Graphify:

```
/knowledge status
/knowledge list
```

Isso é útil para tarefas de mais alto nível (ex.: "estou implementando o ADR-026 de auditoria") enquanto o Graphify cobre a navegação estrutural de código.

### 7. Registrar a integração como decisão arquitetural

Seguindo a convenção rígida do projeto de documentar decisões técnicas relevantes, registre um novo ADR (ex.: `docs/adrs/ADR-027-integracao-graph-engineering-agentes-ia.md`) descrevendo a adoção do Graphify e a padronização entre Claude Code e Gemini CLI, já que toda decisão arquitetural "deve ser registrada" segundo o `README.md` e o `GEMINI.md`.

## Tabela Comparativa do Setup Final

| Aspecto                              | Claude Code                                                                            | Gemini CLI                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Comando de instalação da skill     | `graphify install --project --platform claude`                                       | `graphify install --project --platform gemini`                   |
| Local da skill no repo               | `.claude/skills/graphify/`                                                           | `.gemini/skills/graphify/`                                       |
| Engine de grafo nativa complementar  | Não possui engine nativa; usa apenas Graphify + hooks/agents locais                   | Possui`/knowledge` (Knowledge Graph Engine própria)             |
| Persistência/memória de projeto    | `.claude/memory/team/` (arquivos de referência versionados)                         | `.gemini/memory/` sincronizado via `sync-memory.sh` e Makefile |
| Comando para gerar/atualizar o grafo | `/graphify .` (ou `--incremental` via hook)                                        | `/graphify .`                                                    |
| Automação recomendada              | Hook`PostToolUse` em `.claude/settings.json` chamando `graphify . --incremental` | `make setup-gemini-hook` + pre-commit já existente no projeto   |

Com esse setup simétrico, o time de engenharia do MonFinTrack passa a ter uma camada de graph engineering consistente e padronizada nas duas ferramentas de IA já em uso no `CCAT-monFinTrack`, aproveitando ao máximo a infraestrutura de skills, hooks e memória que o repositório já implementa nativamente.

---

## References

1. [Graphify for Claude Code: How a Karpathy-Inspired ...](https://www.mindstudio.ai/blog/graphify-claude-code-knowledge-graph-large-codebase-70x) - The result is a queryable knowledge graph that gets built once, before your session starts, so Claud...
2. [tirth8205/code-review-graph: Local-first ...](https://github.com/tirth8205/code-review-graph) - Local-first code intelligence graph for MCP and CLI. Builds a persistent map of your codebase so AI ...
3. [Better Code Review Graph](https://mcpservers.org/servers/n24q02m/better-code-review-graph) - Knowledge graph for token-efficient code reviews with Tree-sitter parsing, dual-mode embedding (ONNX...
4. [juspay/code-review-graph-rescript](https://github.com/juspay/code-review-graph-rescript) - Requires Python 3.10+. For the best experience, install uv (the MCP config will use uvx if available...
5. [Egonex-AI/Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) - Turn any codebase, knowledge base, or docs into an interactive knowledge graph you can explore, sear...
6. [GitHub - Graphify-Labs/graphify: Turn any codebase, with ...](https://github.com/Graphify-Labs/graphify) - Turn any codebase, with its docs, SQL schemas, configs, and PDFs, into a queryable knowledge graph. ...
7. [graphify - AI Agents on GitHub (76.3k★)](https://skillsllm.com/skill/graphify) - How do I install graphify? Clone the repository with "git clone https://github.com/safishamsi/graphi...
8. [Graphify — Knowledge Graphs for AI Coding Assistants](https://graphify.net/) - Graphify builds queryable knowledge graphs from code, docs, papers, and diagrams so AI coding assist...
9. [Graphify · the code knowledge graph for AI coding assistants](https://graphify.com/) - Open-source and on-device. One command maps your repo into a graph your AI assistant traverses inste...
