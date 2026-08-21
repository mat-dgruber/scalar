# Google Gemini Integration (BYOK & Model Selection) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Google Gemini into `@scalar/agent-chat` and `@scalar/api-reference`, allowing users to provide their own Gemini API key, select models (defaulting to `gemini-3.7-flash`), stream direct client-side responses or route through an optional custom proxy, and configure settings both via code and via an in-chat UI modal with localStorage persistence.

**Architecture:** Extend `@scalar/types` and `@scalar/schemas` with Gemini configuration types (`GeminiConfig`, `GeminiModel`, `AgentConfiguration`). In `@scalar/agent-chat`, build a dedicated `GeminiChatTransport` that bridges Google Generative AI's streaming format and tool calling protocol with the chat state, backed by a reactive settings store (`gemini-settings.ts`) and an interactive `AgentSettingsModal.vue` UI component.

**Tech Stack:** TypeScript, Vue 3 (Composition API), `@scalar/validation` (typebox-based), Zod, Vitest.

## Global Constraints

- Default model: `gemini-3.7-flash`
- Supported frontier models: `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-pro`, `gemini-3.1-flash-lite`
- Supported stable models: `gemini-2.5-pro`, `gemini-2.5-flash`
- Custom model support: Any arbitrary string model identifier
- Storage key for UI persistence: `scalar_agent_gemini_config`
- All package tests must be scoped: `corepack pnpm vitest packages/<name> --run`
- Linting must use `corepack pnpm biome check --write <files>`

---

### Task 1: Type Definitions and Validation Schemas for Gemini

**Files:**
- Modify: `packages/types/src/api-reference/base-configuration.ts`
- Modify: `packages/schemas/src/api-reference/base-configuration.ts`
- Create: `packages/schemas/src/api-reference/gemini-configuration.test.ts`

**Interfaces:**
- Produces:
  - `export type GeminiModel = 'gemini-3.7-flash' | 'gemini-3.6-flash' | 'gemini-3.5-flash' | 'gemini-3.1-pro' | 'gemini-3.1-flash-lite' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | (string & {})`
  - `export interface GeminiConfig { apiKey?: string; model?: GeminiModel; baseUrl?: string }`
  - `export type AgentProvider = 'scalar' | 'gemini'`
  - `export interface AgentConfiguration { provider?: AgentProvider; key?: string; gemini?: GeminiConfig }`
  - `geminiConfigurationSchema` in `@scalar/schemas`

- [ ] **Step 1: Write the failing test for Gemini schema validation**

Create `packages/schemas/src/api-reference/gemini-configuration.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { coerce } from '@scalar/validation'
import { baseConfigurationSchema } from './base-configuration'

describe('geminiConfigurationSchema', () => {
  it('validates and accepts gemini configuration with default model', () => {
    const config = {
      agent: {
        provider: 'gemini' as const,
        gemini: {
          apiKey: 'AIzaSyTestKey123',
          model: 'gemini-3.7-flash',
        },
      },
    }

    const parsed = coerce(baseConfigurationSchema, config)
    expect(parsed.agent?.provider).toBe('gemini')
    expect(parsed.agent?.gemini?.apiKey).toBe('AIzaSyTestKey123')
    expect(parsed.agent?.gemini?.model).toBe('gemini-3.7-flash')
  })

  it('allows custom baseUrl and custom model string', () => {
    const config = {
      agent: {
        provider: 'gemini' as const,
        gemini: {
          apiKey: 'key',
          model: 'custom-internal-model',
          baseUrl: 'https://ai-proxy.company.internal',
        },
      },
    }

    const parsed = coerce(baseConfigurationSchema, config)
    expect(parsed.agent?.gemini?.baseUrl).toBe('https://ai-proxy.company.internal')
    expect(parsed.agent?.gemini?.model).toBe('custom-internal-model')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm vitest packages/schemas/src/api-reference/gemini-configuration.test.ts --run`
Expected: FAIL (missing `agent` property on `baseConfigurationSchema`)

- [ ] **Step 3: Update `@scalar/types` and `@scalar/schemas`**

In `packages/types/src/api-reference/base-configuration.ts`, add the Zod schema and TypeScript exports for `GeminiModel`, `GeminiConfig`, and `AgentConfiguration`.

In `packages/schemas/src/api-reference/base-configuration.ts`, add the `@scalar/validation` schema definitions for `geminiConfigSchema` and `agentConfigurationSchema`, and add `agent: optional(agentConfigurationSchema)` to `baseConfigurationSchema`.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm vitest packages/schemas/src/api-reference/gemini-configuration.test.ts --run`
Expected: PASS

- [ ] **Step 5: Check types and commit**

Run:
```bash
corepack pnpm --filter @scalar/types types:check
corepack pnpm --filter @scalar/schemas types:check
git add packages/types/ packages/schemas/
git commit -m "feat(schemas): add gemini agent configuration schemas and types"
```

---

### Task 2: Gemini Chat Transport & Tool Calling Adapter

**Files:**
- Create: `packages/agent-chat/src/transports/gemini-chat-transport.ts`
- Create: `packages/agent-chat/src/transports/gemini-chat-transport.test.ts`

**Interfaces:**
- Consumes: `GeminiConfig`, `GeminiModel` from `@scalar/types`
- Produces: `class GeminiChatTransport implements ChatTransport`
  - `sendMessages({ messages, tools, signal }): Promise<ReadableStream<ChatTransportChunk>>`
  - `formatToolsForGemini(tools): GeminiToolDeclaration[]`
  - `convertMessagesToGemini(messages): GeminiContent[]`

- [ ] **Step 1: Write failing unit test for message conversion and transport**

Create `packages/agent-chat/src/transports/gemini-chat-transport.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  convertMessagesToGemini,
  formatToolsForGemini,
  GeminiChatTransport,
} from './gemini-chat-transport'

describe('GeminiChatTransport', () => {
  it('converts user and assistant messages to Gemini Content structure', () => {
    const messages = [
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'List all pets' }] },
      { id: '2', role: 'assistant', parts: [{ type: 'text', text: 'Sure! Here they are.' }] },
    ]

    const contents = convertMessagesToGemini(messages)
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'List all pets' }] },
      { role: 'model', parts: [{ text: 'Sure! Here they are.' }] },
    ])
  })

  it('formats Scalar tools to Gemini functionDeclarations', () => {
    const tools = {
      'execute-request': {
        description: 'Execute HTTP request',
        parameters: {
          type: 'object',
          properties: {
            method: { type: 'string' },
            url: { type: 'string' },
          },
          required: ['method', 'url'],
        },
      },
    }

    const geminiTools = formatToolsForGemini(tools)
    expect(geminiTools[0].functionDeclarations[0].name).toBe('execute_request')
    expect(geminiTools[0].functionDeclarations[0].description).toBe('Execute HTTP request')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm vitest packages/agent-chat/src/transports/gemini-chat-transport.test.ts --run`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `GeminiChatTransport`**

Create `packages/agent-chat/src/transports/gemini-chat-transport.ts` implementing:
1. `convertMessagesToGemini()`: Handles `user`, `assistant` (mapped to `model`), tool calls (`functionCall`), and tool results (`functionResponse`).
2. `formatToolsForGemini()`: Converts JSON Schema parameter objects to Gemini function declarations (sanitizing tool name hyphens to underscores: `execute-request` -> `execute_request`).
3. `GeminiChatTransport` class: Uses `fetch` to call `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}` (default `baseUrl`: `https://generativelanguage.googleapis.com`), parses the SSE stream chunks, and returns standard UI stream chunks.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm vitest packages/agent-chat/src/transports/gemini-chat-transport.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-chat/src/transports/
git commit -m "feat(agent-chat): add gemini chat transport and tool adapter"
```

---

### Task 3: LocalStorage Persistence & Gemini Settings Store

**Files:**
- Create: `packages/agent-chat/src/state/gemini-settings.ts`
- Create: `packages/agent-chat/src/state/gemini-settings.test.ts`
- Modify: `packages/agent-chat/src/state/state.ts`

**Interfaces:**
- Produces:
  - `STORAGE_KEY_GEMINI_CONFIG = 'scalar_agent_gemini_config'`
  - `loadStoredGeminiConfig(): GeminiConfig | null`
  - `saveStoredGeminiConfig(config: GeminiConfig): void`
  - `clearStoredGeminiConfig(): void`
  - `getEffectiveGeminiConfig(propsConfig?: GeminiConfig): GeminiConfig`
  - Update `createChat` to select `GeminiChatTransport` when `provider === 'gemini'` or Gemini config is present.

- [ ] **Step 1: Write failing test for settings loading and precedence**

Create `packages/agent-chat/src/state/gemini-settings.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getEffectiveGeminiConfig,
  loadStoredGeminiConfig,
  saveStoredGeminiConfig,
  STORAGE_KEY_GEMINI_CONFIG,
} from './gemini-settings'

describe('gemini-settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to gemini-3.7-flash when no config is stored or passed', () => {
    const config = getEffectiveGeminiConfig()
    expect(config.model).toBe('gemini-3.7-flash')
  })

  it('prefers localStorage settings over prop settings', () => {
    saveStoredGeminiConfig({
      apiKey: 'stored-key',
      model: 'gemini-2.5-pro',
    })

    const config = getEffectiveGeminiConfig({
      apiKey: 'prop-key',
      model: 'gemini-3.7-flash',
    })

    expect(config.apiKey).toBe('stored-key')
    expect(config.model).toBe('gemini-2.5-pro')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm vitest packages/agent-chat/src/state/gemini-settings.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement `gemini-settings.ts` and integrate in `state.ts`**

1. Write `packages/agent-chat/src/state/gemini-settings.ts`.
2. In `packages/agent-chat/src/state/state.ts`, read the effective Gemini configuration and instantiate `GeminiChatTransport` when provider is `'gemini'` or an API key exists.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm vitest packages/agent-chat/src/state/gemini-settings.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-chat/src/state/
git commit -m "feat(agent-chat): add gemini settings store and dynamic transport selection"
```

---

### Task 4: UI Settings Modal & Model Selector

**Files:**
- Create: `packages/agent-chat/src/views/Settings/AgentSettingsModal.vue`
- Create: `packages/agent-chat/src/views/Settings/AgentSettingsModal.test.ts`
- Modify: `packages/agent-chat/src/Chat.vue` (add settings button to header)

**Interfaces:**
- Consumes: `gemini-settings.ts`
- Produces: `AgentSettingsModal.vue`
  - Input for API Key (masked with reveal toggle)
  - Select for Models:
    - Frontier (3.x): `gemini-3.7-flash` (Default), `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-pro`, `gemini-3.1-flash-lite`
    - Stable (2.5): `gemini-2.5-pro`, `gemini-2.5-flash`
    - Custom: Custom input field
  - Expandable Proxy / Base URL field
  - Save button that emits updated config and updates `localStorage`

- [ ] **Step 1: Write test for `AgentSettingsModal.vue`**

Create `packages/agent-chat/src/views/Settings/AgentSettingsModal.test.ts` testing modal open/close, model selection, key input, and save triggering `saveStoredGeminiConfig`.

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm vitest packages/agent-chat/src/views/Settings/AgentSettingsModal.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement `AgentSettingsModal.vue` and wire into `Chat.vue`**

1. Build `AgentSettingsModal.vue` with Tailwind / Scalar Design System styling.
2. In `Chat.vue`, add a gear icon button (`ScalarIconButton` with `ScalarIcon name="Settings"`) in the top navigation bar to toggle `isSettingsOpen`.

- [ ] **Step 4: Run tests and verify**

Run: `corepack pnpm vitest packages/agent-chat/src/views/Settings/AgentSettingsModal.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-chat/
git commit -m "feat(agent-chat): add agent settings modal with model selector and key input"
```

---

### Task 5: Integration, Typecheck, and Verification

**Files:**
- Modify: `packages/api-reference/src/components/AgentScalar/AgentScalarDrawer.vue`
- Create: `changeset`

- [ ] **Step 1: Verify end-to-end typecheck on affected packages**

Run:
```bash
corepack pnpm --filter @scalar/types types:check
corepack pnpm --filter @scalar/schemas types:check
corepack pnpm --filter @scalar/agent-chat types:check
corepack pnpm --filter @scalar/api-reference types:check
```

- [ ] **Step 2: Run test suite across affected packages**

Run:
```bash
corepack pnpm vitest packages/schemas --run
corepack pnpm vitest packages/agent-chat --run
```

- [ ] **Step 3: Create Changeset**

Run:
```bash
corepack pnpm changeset add
```
Select `patch` or `minor` for `@scalar/types`, `@scalar/schemas`, `@scalar/agent-chat`, `@scalar/api-reference`.

- [ ] **Step 4: Final verification and commit**
