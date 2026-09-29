<!--
================================================================================
LOG DE MANUTENÇÃO DE DOCUMENTAÇÃO
--------------------------------------------------------------------------------
Data       | Autor          | Descrição
--------------------------------------------------------------------------------
2026-09-29 | Matheus Diniz  | Registro consolidado de desenvolvimento da sessão.
================================================================================
-->

# Registro de Desenvolvimento — 2026-09-29

| Metadado | Detalhe |
| :--- | :--- |
| **Escopo Principal** | Isolamento de Nuvem Scalar e Integração Nativa do Gemini 3.8 Flash |
| **Commits Gerados** | 8 (6 de código e testes + 2 de governança, documentação e guias) |
| **Arquivos Modificados** | 45 arquivos |
| **ADRs Vinculadas / Geradas** | `docs/adr/0001-isolamento-infraestrutura-scalar-cloud-e-gemini-38-flash.md` |

---

## 1. Visão Geral das Alterações
Esta sessão neutralizou sistematicamente todas as dependências da infraestrutura de nuvem pública da Scalar (`proxy.scalar.com`, `api.scalar.com`, `fonts.scalar.com`, telemetria PostHog), garantindo autonomia 100% autônoma, privada e compatível com ambientes air-gapped/Zero-Trust. Além disso, incorporou o modelo de última geração `gemini-3.8-flash` como padrão recomendado no Chat e Ask AI via streaming SSE direto no cliente (BYOK), solucionando simultaneamente incompatibilidades de runtime do Node 22 com `localStorage`.

---

## 2. Arquitetura Afetada & Decisões (ADRs)
- **Decisões Registradas:**
  - `docs/adr/0001-isolamento-infraestrutura-scalar-cloud-e-gemini-38-flash.md`: Formalização do desacoplamento do proxy padrão, supressão de telemetria/fontes remotas por padrão e adoção do `gemini-3.8-flash`.

- **Diagrama de Relações e Fluxos:**

```mermaid
graph TD
    subgraph "Ambiente Seguro / Air-Gapped"
        User([Desenvolvedor / Usuário]) --> WebApp[Scalar Reference UI]
        WebApp --> ClientReq[Workspace Store / API Client]
        WebApp --> ChatAgent[Agent Chat / Ask AI]
        
        ChatAgent -- "BYOK SSE Streaming" --> GeminiService[Google Gemini API / gemini-3.8-flash]
        ClientReq -- "Chamada Direta ou Proxy Interno" --> TargetAPI[API Corporativa Alvo]
    end

    subgraph "Nuvem Pública Externa Scalar (Desativada)"
        P[proxy.scalar.com]
        T[telemetry.scalar.com / PostHog]
        F[fonts.scalar.com]
        R[api.scalar.com/vector/registry]
    end

    ClientReq -. "X (Bloqueado por padrão)" .-> P
    WebApp -. "X (telemetry: false)" .-> T
    WebApp -. "X (withDefaultFonts: false)" .-> F
    ChatAgent -. "X (Indexação Local)" .-> R
```

---

## 3. Mapa de Arquivos Modificados

| Arquivo | Camada Técnica | Resumo da Modificação |
| :--- | :--- | :--- |
| `packages/schemas/src/api-reference/base-configuration.ts` | Schemas / Validação | Defaults seguros (`telemetry: false`, `withDefaultFonts: false`, `gemini-3.8-flash`) |
| `packages/types/src/api-reference/base-configuration.ts` | Tipagem Central | Atualização das interfaces canônicas e compatibilização Zod |
| `packages/workspace-store/src/request-example/context/proxy.ts` | Backend / Store | `getDefaultProxyUrl` retorna `null` para evitar desvios externos |
| `packages/agent-chat/src/transports/gemini-chat-transport.ts` | AI Integration | Streaming direto SSE com suporte nativo ao `gemini-3.8-flash` |
| `packages/agent-chat/src/views/Settings/AgentSettingsModal.vue` | UI / Apresentação | Seleção e recomendação padrão do modelo Gemini 3.8 Flash |
| `packages/helpers/src/object/local-storage.ts` | Core Helpers | Fallback em memória resiliente para `safeLocalStorage` no Node 22 |
| `packages/api-reference/src/helpers/upload-temp-document.ts` | Core Reference | Trava de segurança impedindo compartilhamento externo sem URL base |
| `packages/api-reference/src/vitest.setup.ts` | Test Harness | Polyfill em memória de storage e isolamento de sonner toasts no JSDOM |
| `packages/api-reference/src/features/example-responses/ExampleResponses.test.ts` | Test Suite | Alinhamento de asserção da cópia de JSON formatado |
| `docs/adr/0001-isolamento-infraestrutura-scalar-cloud-e-gemini-38-flash.md` | Governança | ADR formal sobre isolamento de nuvem e modelo Gemini 3.8 Flash |
| `docs/guides/guia-arquitetura-e-manutencao-scalar-fork.md` | Documentação | Atualização da arquitetura, ADR 0001 e suporte Gemini 3.8 |
| `docs/guides/guia-padrao-scalar-openapi-dx.md` | Documentação | Guia canônico atualizado com padrão Zero-Cloud e Gemini 3.8 |

---

## 4. Detalhamento por Commit

### `feat(schemas,types): support gemini-3.8-flash and enforce secure self-hosted defaults`
- **Razão da alteração:** Definir contratos de dados seguros para ambientes on-premises e permitir seleção do modelo Gemini 3.8 Flash.
- **Comportamento atual:** Schemas Zod validam `gemini-3.8-flash` como padrão e desativam telemetria e download de fontes por omissão.
- **Decisões técnicas & ADRs:** ADR 0001 (Seções 2 e 3).
- **Arquivos envolvidos:**
  - `packages/schemas/src/api-reference/*`: Schemas de configuração de referência e Gemini.
  - `packages/types/src/api-reference/*`: Tipos TypeScript espelho.

### `fix(helpers): add resilient storage fallback and improve testing suite reliability`
- **Razão da alteração:** O runtime Node 22 emite advertências ou falhas ao acessar `localStorage` incompleto sem flag experimental em testes unitários.
- **Comportamento atual:** `safeLocalStorage` opera transparentemente em memória volátil quando o storage nativo não está disponível ou lança exceção.
- **Decisões técnicas & ADRs:** Resiliência de execução headless para CI/CD corporativo.
- **Arquivos envolvidos:**
  - `packages/helpers/src/object/local-storage.ts`: Fallback in-memory.
  - `packages/helpers/src/theme/load-css-variables.test.ts`: Validação de variáveis CSS dos temas `harpia`, `cinematicNoir` e `ccat`.

### `feat(workspace-store): decouple default proxy from scalar cloud infrastructure`
- **Razão da alteração:** Eliminar vazamento automático de requisições de teste para `proxy.scalar.com`.
- **Comportamento atual:** `getDefaultProxyUrl` retorna `null`. O cliente faz chamadas diretas à API corporativa.
- **Decisões técnicas & ADRs:** ADR 0001 (Seção 2).
- **Arquivos envolvidos:**
  - `packages/workspace-store/src/request-example/context/proxy.ts`: Desacoplamento de proxy.
  - `packages/workspace-store/src/request-example/context/proxy.test.ts`: Testes unitários com proxy `null`.

### `feat(agent-chat): add native gemini-3.8-flash model support and air-gapped registry decoupling`
- **Razão da alteração:** Fornecer IA rápida, multimodal e de baixo custo operacional com privacidade total e sem dependência de registry na nuvem.
- **Comportamento atual:** Chat e Ask AI configurados para utilizar `gemini-3.8-flash` com indexação de operações OpenAPI local no browser.
- **Decisões técnicas & ADRs:** ADR 0001 (Seção 2).
- **Arquivos envolvidos:**
  - `packages/agent-chat/src/transports/gemini-chat-transport.ts`: Transporte SSE.
  - `packages/agent-chat/src/views/Settings/AgentSettingsModal.vue`: Modal de configurações com Gemini 3.8 Flash.

### `fix(api-reference,components): guard external uploads and stabilize headless test environment`
- **Razão da alteração:** Prevenir chamadas acidentais a rotas externas de compartilhamento e eliminar erros de montagem do `vue-sonner` sob JSDOM.
- **Comportamento atual:** Upload bloqueado sem `apiBaseUrl` explícito e suíte de testes 100% verde em headless.
- **Decisões técnicas & ADRs:** ADR 0001 (Seção 3).
- **Arquivos envolvidos:**
  - `packages/api-reference/src/helpers/upload-temp-document.ts`: Trava defensiva.
  - `packages/api-reference/src/vitest.setup.ts`: Setup de testes unitários.

### `docs(guides): atualizar arquitetura e guia padrao com gemini-3.8-flash e ADR 0001`
- **Razão da alteração:** Manter a documentação técnica interna alinhada às decisões arquiteturais e operacionais aprovadas na ADR 0001.
- **Comportamento atual:** Guias detalham o isolamento estrito da Scalar Cloud, fluxo de streaming SSE com Gemini 3.8 Flash e políticas de CSP Zero-Trust.
- **Decisões técnicas & ADRs:** ADR 0001.
- **Arquivos envolvidos:**
  - `docs/guides/guia-arquitetura-e-manutencao-scalar-fork.md`: Versão 1.1.0 com diagramas e fluxos.
  - `docs/guides/guia-padrao-scalar-openapi-dx.md`: Versão 2.8.0 com exemplos FastAPI e TypeScript.

### `test(api-reference): assert formatted string on example response copy action`
- **Razão da alteração:** Corrigir asserção desatualizada que verificava passagem de objeto JavaScript bruto para o clipboard em vez da string JSON formatada.
- **Comportamento atual:** Teste unitário verifica fielmente a chamada a `copyToClipboard()` com o JSON serializado e formatado com 2 espaços de indentação.
- **Decisões técnicas & ADRs:** Alinhamento de comportamento observável do usuário.
- **Arquivos envolvidos:**
  - `packages/api-reference/src/features/example-responses/ExampleResponses.test.ts`: Asserção corrigida.

---

## 5. Dívida Técnica & Próximos Passos

- [ ] Sincronizar as atualizações no serviço consumidor `meucpb-backend`:
  - Atualizar `app/static/scalar/scalar.config.js` removendo `proxyUrl: "https://proxy.scalar.com"` e definindo `model: "gemini-3.8-flash"`.
  - Atualizar o header CSP em `app/main.py` eliminando referências a `proxy.scalar.com` e `api.scalar.com`.
  - Copiar o bundle standalone recém-compilado para `app/static/scalar/standalone.js`.
  - Atualizar `tests/test_scalar_docs.py` para refletir os novos valores de proxy e modelo.
- [ ] Avaliar empacotamento de bundle offline para ícones SVG em ambientes 100% desconectados de CDN.
- [ ] Executar pipeline de auditoria Playwright E2E em container isolado de CI.
