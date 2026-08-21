# Design Spec: Integração Google Gemini no Scalar (BYOK & Model Selection)

**Data**: 2026-08-21  
**Status**: Aprovado  
**Escopo**: `@scalar/types`, `@scalar/schemas`, `@scalar/agent-chat`, `@scalar/api-reference`

---

## 1. Visão Geral e Objetivos

Permitir que usuários e desenvolvedores utilizem seus próprios modelos e chaves da API do **Google Gemini** (Bring Your Own Key - BYOK) diretamente no assistente de IA do Scalar (`@scalar/agent-chat` e `@scalar/api-reference`), com suporte a seleção de modelos, streaming direto no navegador e suporte opcional a proxy corporativo.

### Objetivos Principais:
- Permitir configuração por código (`agent.gemini`) e sobrescrita na interface do usuário (UI Settings Modal).
- Definir `gemini-3.7-flash` como modelo padrão, com catálogo atualizado de modelos suportados (`gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-pro`, `gemini-3.1-flash-lite`, `gemini-2.5-pro`, `gemini-2.5-flash`, custom).
- Suportar chamadas diretas client-side via Google Generative Language API e roteamento opcional por gateway/proxy interno.
- Preservar compatibilidade total com as ferramentas (client tools) do Scalar: `execute-request`, `search-openapi-operations` e `ask-for-authentication`.

> [!NOTE]
> As séries legadas `gemini-2.0-flash` e `gemini-1.5-*` foram descontinuadas pelo Google em favor das gerações **Gemini 3.x** e **Gemini 2.5**.

---

## 2. Arquitetura e Estrutura de Tipos

### 2.1. `@scalar/types` e `@scalar/schemas`
Extensão da interface de configuração do Agent:

```ts
export type AgentProvider = 'scalar' | 'gemini'

export type GeminiModel =
  | 'gemini-3.7-flash'
  | 'gemini-3.6-flash'
  | 'gemini-3.5-flash'
  | 'gemini-3.1-pro'
  | 'gemini-3.1-flash-lite'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | (string & {})

export interface GeminiConfig {
  apiKey?: string
  model?: GeminiModel
  baseUrl?: string
}

export interface AgentConfiguration {
  provider?: AgentProvider
  gemini?: GeminiConfig
  // ...opções existentes mantidas
}
```

---

## 3. Camada de Transporte e Estado (`@scalar/agent-chat`)

### 3.1. `GeminiChatTransport`
- Implementa o protocolo de chat para o Vercel AI SDK ou transporte REST streaming compatível com `GoogleGenerativeAI`.
- Endpoint padrão de streaming direto:
  `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={apiKey}`
- Mapeamento das tools do Scalar para `functionDeclarations` do Google Gemini.
- Truncamento e sanitização de respostas em `MAX_RESPONSE_SIZE = 50_000` bytes para respeitar limites de contexto e evitar memory leaks.

### 3.2. Gerenciamento de Estado e Precedência
A resolução da chave e do modelo segue a hierarquia:
1. **Local Storage da UI**: `localStorage.getItem('scalar_agent_gemini_config')` (permite ao desenvolvedor inserir sua própria chave de teste).
2. **Prop/Configuração via Código**: `props.agent.gemini` ou `state.geminiConfig`.
3. **Defaults Globais**: Provedor `gemini`, modelo `gemini-3.7-flash`.

---

## 4. Interface do Usuário (UI)

### 4.1. `AgentSettingsModal.vue`
- Adicionado ao cabeçalho do Drawer do `@scalar/agent-chat` / `@scalar/api-reference`.
- **Campos**:
  - Seletor de Provedor: `Google Gemini` / `Scalar Cloud`.
  - Campo de API Key com toggle de visibilidade e link para Google AI Studio.
  - Dropdown de Modelos com agrupamento:
    - **Frontier (3.x)**: `gemini-3.7-flash` (Recomendado/Padrão), `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-pro`, `gemini-3.1-flash-lite`.
    - **Stable (2.5)**: `gemini-2.5-pro`, `gemini-2.5-flash`.
    - **Customizado**: Campo aberto para modelos personalizados / endpoints experimentais.
  - Campo expansível avançado para `Base URL / Proxy`.
- **Persistência**: Botão "Salvar", que grava no `localStorage` e recarrega o transporte do chat sem necessidade de refresh completo da página.

---

## 5. Plano de Testes e Validação

- **Testes Unitários**:
  - Validação do schema `GeminiConfig` em `@scalar/schemas`.
  - Mapeamento de mensagens e tool calls no `GeminiChatTransport`.
  - Teste de precedência de configuração (localStorage vs. props).
- **Testes de Integração UI**:
  - Renderização do modal de configurações e persistência de chave/modelo no `localStorage`.
