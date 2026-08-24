# Standalone Modular MCP Server Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `@scalar/mcp-server` into a robust, modular, and Zero-Trust MCP server offering dynamic OpenAPI exploration, real infrastructure diagnostics, multi-environment switching, and native MCP resources for OpenClaude and Antigravity.

**Architecture:** Layered Clean Architecture splitting Stdio JSON-RPC handlers from business logic modules (`core/`, `openapi/`, `infra/`, `resources/`). Zero external SaaS dependencies; local subprocess execution over Stdio.

**Tech Stack:** TypeScript (NodeNext, ES2022), `@modelcontextprotocol/sdk`, `zod`, `vitest`, `tsx`.

## Global Constraints

- Never commit secrets or hardcoded bearer tokens.
- All HTTP calls must support configurable timeouts via `AbortController` (default: 10s).
- All sensitive HTTP headers (`Authorization`, `X-Api-Key`, `Cookie`) and payload keys (`password`, `secret`, `token`) must be masked before returning to the LLM.
- Changes must be tested with scoped Vitest commands: `corepack pnpm vitest packages/mcp-server --run`.

---

### Task 1: Core Configuration and Security Sanitizer

**Files:**
- Create: `packages/mcp-server/src/core/config.ts`
- Create: `packages/mcp-server/src/core/sanitizer.ts`
- Test: `packages/mcp-server/src/__tests__/config-sanitizer.test.ts`

**Interfaces:**
- Produces:
  - `getConfig(): EnvironmentConfig`
  - `setEnvironment(env: 'local' | 'dev' | 'staging'): EnvironmentConfig`
  - `listEnvironments(): Record<string, { url: string; token: string }>`
  - `maskSecret(value: string, visibleChars?: number): string`
  - `sanitizeHeaders(headers: Record<string, string>): Record<string, string>`
  - `sanitizePayload(data: unknown): unknown`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp-server/src/__tests__/config-sanitizer.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import {
  getConfig,
  listEnvironments,
  setEnvironment,
} from '../core/config.js'
import {
  maskSecret,
  sanitizeHeaders,
  sanitizePayload,
} from '../core/sanitizer.js'

describe('Core Sanitizer', () => {
  it('masks secret strings properly', () => {
    expect(maskSecret('secret-token-12345')).toBe('sec...2345')
    expect(maskSecret('short')).toBe('***')
  })

  it('sanitizes sensitive headers', () => {
    const headers = {
      Authorization: 'Bearer super-secret-key-999',
      'Content-Type': 'application/json',
      'X-Api-Key': 'key-12345678',
    }
    const sanitized = sanitizeHeaders(headers)
    expect(sanitized['Content-Type']).toBe('application/json')
    expect(sanitized['Authorization']).toContain('...')
    expect(sanitized['X-Api-Key']).toContain('...')
  })

  it('sanitizes objects containing sensitive payload keys', () => {
    const payload = {
      username: 'johndoe',
      password: 'mypassword123',
      nested: { api_key: 'topsecret' },
    }
    const sanitized = sanitizePayload(payload) as Record<string, any>
    expect(sanitized.username).toBe('johndoe')
    expect(sanitized.password).toBe('***')
    expect(sanitized.nested.api_key).toBe('***')
  })
})

describe('Core Config', () => {
  it('defaults to local environment and allows switching', () => {
    const initial = getConfig()
    expect(initial.name).toBe('local')
    expect(initial.url).toBeDefined()

    const updated = setEnvironment('staging')
    expect(updated.name).toBe('staging')
    expect(getConfig().name).toBe('staging')

    // Reset back
    setEnvironment('local')
  })

  it('lists configured environments', () => {
    const envs = listEnvironments()
    expect(envs.local).toBeDefined()
    expect(envs.dev).toBeDefined()
    expect(envs.staging).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm vitest packages/mcp-server/src/__tests__/config-sanitizer.test.ts --run`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement `config.ts` and `sanitizer.ts`**

Create `packages/mcp-server/src/core/sanitizer.ts`:
```typescript
const SENSITIVE_HEADER_KEYS = [
  'authorization',
  'x-api-key',
  'api-key',
  'cookie',
  'set-cookie',
]

const SENSITIVE_PAYLOAD_KEYS = [
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'client_secret',
  'private_key',
]

export function maskSecret(value: string, visibleChars = 3): string {
  if (!value || typeof value !== 'string') return '***'
  if (value.length <= visibleChars * 2) return '***'
  const start = value.slice(0, visibleChars)
  const end = value.slice(-visibleChars - 1)
  return `${start}...${end}`
}

export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.includes(key.toLowerCase())) {
      result[key] = maskSecret(val)
    } else {
      result[key] = val
    }
  }
  return result
}

export function sanitizePayload(data: unknown): unknown {
  if (data === null || data === undefined) return data
  if (typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item))
  }

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_PAYLOAD_KEYS.includes(key.toLowerCase())) {
      result[key] = '***'
    } else if (typeof val === 'object' && val !== null) {
      result[key] = sanitizePayload(val)
    } else {
      result[key] = val
    }
  }
  return result
}
```

Create `packages/mcp-server/src/core/config.ts`:
```typescript
export interface EnvironmentConfig {
  name: 'local' | 'dev' | 'staging'
  url: string
  token: string
}

let activeEnvName: 'local' | 'dev' | 'staging' = 'local'

export function listEnvironments(): Record<
  string,
  { url: string; token: string }
> {
  return {
    local: {
      url: process.env.INTERNAL_API_URL || 'http://localhost:5052',
      token: process.env.INTERNAL_API_TOKEN || 'local-dev-token',
    },
    dev: {
      url: process.env.DEV_API_URL || 'http://localhost:3000',
      token: process.env.DEV_API_TOKEN || '',
    },
    staging: {
      url: process.env.STAGING_API_URL || 'http://localhost:8080',
      token: process.env.STAGING_API_TOKEN || '',
    },
  }
}

export function getConfig(): EnvironmentConfig {
  const envs = listEnvironments()
  const current = envs[activeEnvName] || envs.local
  return {
    name: activeEnvName,
    url: current.url,
    token: current.token,
  }
}

export function setEnvironment(
  env: 'local' | 'dev' | 'staging',
): EnvironmentConfig {
  activeEnvName = env
  return getConfig()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm vitest packages/mcp-server/src/__tests__/config-sanitizer.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/core/ packages/mcp-server/src/__tests__/config-sanitizer.test.ts
git commit -m "feat(mcp-server): add core config and security sanitizer with zero-trust masking"
```

---

### Task 2: OpenAPI Loader, Parser and REST Executor

**Files:**
- Create: `packages/mcp-server/src/openapi/loader.ts`
- Create: `packages/mcp-server/src/openapi/parser.ts`
- Create: `packages/mcp-server/src/openapi/executor.ts`
- Test: `packages/mcp-server/src/__tests__/openapi.test.ts`

**Interfaces:**
- Consumes: `getConfig` from `../core/config.js`, `sanitizeHeaders`, `sanitizePayload` from `../core/sanitizer.js`
- Produces:
  - `loadOpenApiSpec(): Promise<Record<string, unknown> | null>`
  - `discoverRoutes(query?: string, tag?: string, method?: string): Promise<RouteSummary[]>`
  - `executeApiRequest(params: RequestExecutionParams): Promise<ExecutionResult>`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp-server/src/__tests__/openapi.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { discoverRoutes } from '../openapi/parser.js'
import { executeApiRequest } from '../openapi/executor.js'

describe('OpenAPI Parser & Route Discovery', () => {
  const mockSpec = {
    openapi: '3.1.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/usuarios': {
        get: {
          summary: 'Listar usuários',
          tags: ['Usuarios'],
          responses: { '200': { description: 'OK' } },
        },
        post: {
          summary: 'Criar usuário',
          tags: ['Usuarios'],
          responses: { '201': { description: 'Criado' } },
        },
      },
      '/pedidos/{id}': {
        get: {
          summary: 'Consultar pedido por ID',
          tags: ['Pedidos'],
          parameters: [{ name: 'id', in: 'path', required: true }],
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  }

  it('filters routes by tag', async () => {
    const routes = await discoverRoutes({ spec: mockSpec, tag: 'Usuarios' })
    expect(routes.length).toBe(2)
    expect(routes.every((r) => r.tags?.includes('Usuarios'))).toBe(true)
  })

  it('filters routes by search query', async () => {
    const routes = await discoverRoutes({ spec: mockSpec, query: 'pedido' })
    expect(routes.length).toBe(1)
    expect(routes[0].path).toBe('/pedidos/{id}')
  })

  it('filters routes by HTTP method', async () => {
    const routes = await discoverRoutes({ spec: mockSpec, metodo: 'POST' })
    expect(routes.length).toBe(1)
    expect(routes[0].method).toBe('POST')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm vitest packages/mcp-server/src/__tests__/openapi.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement `loader.ts`, `parser.ts`, and `executor.ts`**

Create `packages/mcp-server/src/openapi/loader.ts`:
```typescript
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export async function loadOpenApiSpec(): Promise<Record<string, unknown> | null> {
  // 1. Env explicit path
  if (process.env.OPENAPI_SPEC_PATH && existsSync(process.env.OPENAPI_SPEC_PATH)) {
    try {
      const content = readFileSync(process.env.OPENAPI_SPEC_PATH, 'utf-8')
      return JSON.parse(content)
    } catch {
      // Fallback
    }
  }

  // 2. Local workspace files
  const candidateFiles = [
    'openapi.json',
    'swagger.json',
    '.scalar/openapi.json',
    'scalar.json',
  ]

  for (const file of candidateFiles) {
    const fullPath = join(process.cwd(), file)
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf-8')
        return JSON.parse(content)
      } catch {
        // Continue searching
      }
    }
  }

  // 3. Fallback to active Scalar dev server if reachable
  const scalarUrl = process.env.INTERNAL_API_URL || 'http://localhost:5052'
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(`${scalarUrl}/openapi.json`, { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      return (await res.json()) as Record<string, unknown>
    }
  } catch {
    // Dev server not reachable
  }

  return null
}
```

Create `packages/mcp-server/src/openapi/parser.ts`:
```typescript
import { loadOpenApiSpec } from './loader.js'

export interface RouteSummary {
  path: string
  method: string
  summary: string
  tags?: string[]
  parameters?: Array<{ name: string; in: string; required?: boolean }>
}

export interface DiscoverOptions {
  spec?: Record<string, unknown>
  query?: string
  tag?: string
  metodo?: string
}

export async function discoverRoutes(
  options: DiscoverOptions = {},
): Promise<RouteSummary[]> {
  const spec = options.spec || (await loadOpenApiSpec())
  if (!spec || !spec.paths || typeof spec.paths !== 'object') {
    return []
  }

  const results: RouteSummary[] = []
  const queryLower = options.query?.toLowerCase()
  const tagLower = options.tag?.toLowerCase()
  const methodUpper = options.metodo?.toUpperCase()

  for (const [path, methods] of Object.entries(
    spec.paths as Record<string, Record<string, any>>,
  )) {
    if (!methods || typeof methods !== 'object') continue

    for (const [method, op] of Object.entries(methods)) {
      const httpMethod = method.toUpperCase()
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(httpMethod)) {
        continue
      }

      if (methodUpper && httpMethod !== methodUpper) continue

      const tags: string[] = op.tags || []
      if (tagLower && !tags.some((t) => t.toLowerCase().includes(tagLower))) {
        continue
      }

      const summary: string = op.summary || op.description || ''
      if (
        queryLower &&
        !path.toLowerCase().includes(queryLower) &&
        !summary.toLowerCase().includes(queryLower)
      ) {
        continue
      }

      results.push({
        path,
        method: httpMethod,
        summary,
        tags,
        parameters: op.parameters,
      })
    }
  }

  return results
}
```

Create `packages/mcp-server/src/openapi/executor.ts`:
```typescript
import { getConfig, listEnvironments } from '../core/config.js'
import { sanitizeHeaders, sanitizePayload } from '../core/sanitizer.js'

export interface RequestExecutionParams {
  endpoint: string
  metodo: string
  params?: Record<string, string | number>
  payload?: Record<string, unknown>
  headers?: Record<string, string>
  ambiente?: 'local' | 'dev' | 'staging'
  timeoutMs?: number
}

export interface ExecutionResult {
  status: number
  statusText: string
  url: string
  durationMs: number
  headers: Record<string, string>
  data: unknown
}

export async function executeApiRequest(
  params: RequestExecutionParams,
): Promise<ExecutionResult> {
  const envConfig = params.ambiente
    ? listEnvironments()[params.ambiente] || getConfig()
    : getConfig()

  let urlStr = `${envConfig.url.replace(/\/$/, '')}/${params.endpoint.replace(/^\//, '')}`

  if (params.params && Object.keys(params.params).length > 0) {
    const query = new URLSearchParams()
    for (const [k, v] of Object.entries(params.params)) {
      query.append(k, String(v))
    }
    urlStr += `?${query.toString()}`
  }

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...params.headers,
  }

  if (envConfig.token && !reqHeaders.Authorization) {
    reqHeaders.Authorization = `Bearer ${envConfig.token}`
  }

  const controller = new AbortController()
  const timeoutMs = params.timeoutMs || 10000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const startTime = Date.now()

  try {
    const response = await fetch(urlStr, {
      method: params.metodo.toUpperCase(),
      headers: reqHeaders,
      body: params.payload ? JSON.stringify(params.payload) : undefined,
      signal: controller.signal,
    })

    const durationMs = Date.now() - startTime
    const bodyText = await response.text()
    let parsedBody: unknown = bodyText

    try {
      parsedBody = JSON.parse(bodyText)
    } catch {
      // Keep as string
    }

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val
    })

    return {
      status: response.status,
      statusText: response.statusText,
      url: urlStr,
      durationMs,
      headers: sanitizeHeaders(responseHeaders),
      data: sanitizePayload(parsedBody),
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm vitest packages/mcp-server/src/__tests__/openapi.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/openapi/ packages/mcp-server/src/__tests__/openapi.test.ts
git commit -m "feat(mcp-server): add openapi loader, dynamic route parser, and resilient http executor"
```

---

### Task 3: Infrastructure Diagnostics and Real Healthcheck Engine

**Files:**
- Create: `packages/mcp-server/src/infra/health.ts`
- Create: `packages/mcp-server/src/infra/diagnostics.ts`
- Test: `packages/mcp-server/src/__tests__/infra.test.ts`

**Interfaces:**
- Consumes: `getConfig` from `../core/config.js`
- Produces:
  - `checkServiceHealth(targetUrl: string, timeoutMs?: number): Promise<HealthCheckResult>`
  - `runFullDiagnostics(): Promise<FullDiagnosticsResult>`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp-server/src/__tests__/infra.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { checkServiceHealth } from '../infra/health.js'

describe('Infra Healthcheck Engine', () => {
  it('returns structured DOWN status for unreachable URLs gracefully without throwing', async () => {
    const result = await checkServiceHealth('http://127.0.0.1:59999/health', 500)
    expect(result.status).toBe('DOWN')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.error).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm vitest packages/mcp-server/src/__tests__/infra.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement `health.ts` and `diagnostics.ts`**

Create `packages/mcp-server/src/infra/health.ts`:
```typescript
export interface HealthCheckResult {
  url: string
  status: 'UP' | 'DOWN'
  statusCode?: number
  durationMs: number
  timestamp: string
  error?: string
}

export async function checkServiceHealth(
  targetUrl: string,
  timeoutMs = 5000,
): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
    })

    const durationMs = Date.now() - startTime
    return {
      url: targetUrl,
      status: res.ok || res.status < 500 ? 'UP' : 'DOWN',
      statusCode: res.status,
      durationMs,
      timestamp,
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const message = err instanceof Error ? err.message : String(err)
    return {
      url: targetUrl,
      status: 'DOWN',
      durationMs,
      timestamp,
      error: message,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
```

Create `packages/mcp-server/src/infra/diagnostics.ts`:
```typescript
import { getConfig, listEnvironments } from '../core/config.js'
import { checkServiceHealth, type HealthCheckResult } from './health.js'

export interface FullDiagnosticsResult {
  timestamp: string
  activeEnvironment: string
  services: HealthCheckResult[]
  nodeVersion: string
  uptimeSeconds: number
}

export async function runFullDiagnostics(): Promise<FullDiagnosticsResult> {
  const envs = listEnvironments()
  const current = getConfig()
  const checkTargets = [
    current.url,
    envs.local.url,
    envs.dev.url,
  ].filter((url, idx, arr) => arr.indexOf(url) === idx && Boolean(url))

  const checks = await Promise.all(
    checkTargets.map((url) => checkServiceHealth(url, 3000)),
  )

  return {
    timestamp: new Date().toISOString(),
    activeEnvironment: current.name,
    services: checks,
    nodeVersion: process.version,
    uptimeSeconds: process.uptime(),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm vitest packages/mcp-server/src/__tests__/infra.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/infra/ packages/mcp-server/src/__tests__/infra.test.ts
git commit -m "feat(mcp-server): add real infrastructure connectivity and diagnostics engine"
```

---

### Task 4: MCP Native Resources Provider

**Files:**
- Create: `packages/mcp-server/src/resources/index.ts`
- Test: `packages/mcp-server/src/__tests__/resources.test.ts`

**Interfaces:**
- Consumes: `loadOpenApiSpec` from `../openapi/loader.js`, `runFullDiagnostics` from `../infra/diagnostics.js`
- Produces:
  - `listMcpResources(): Array<{ uri: string; name: string; mimeType: string }>`
  - `readMcpResource(uri: string): Promise<{ uri: string; mimeType: string; text: string }>`

- [ ] **Step 1: Write the failing test**

Create `packages/mcp-server/src/__tests__/resources.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { listMcpResources, readMcpResource } from '../resources/index.js'

describe('MCP Resources Provider', () => {
  it('lists registered resources', () => {
    const resources = listMcpResources()
    expect(resources.some((r) => r.uri === 'openapi://spec')).toBe(true)
    expect(resources.some((r) => r.uri === 'infra://health-status')).toBe(true)
  })

  it('reads infra health status resource as valid JSON string', async () => {
    const result = await readMcpResource('infra://health-status')
    expect(result.uri).toBe('infra://health-status')
    expect(result.mimeType).toBe('application/json')
    const parsed = JSON.parse(result.text)
    expect(parsed.activeEnvironment).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm vitest packages/mcp-server/src/__tests__/resources.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement `resources/index.ts`**

Create `packages/mcp-server/src/resources/index.ts`:
```typescript
import { runFullDiagnostics } from '../infra/diagnostics.js'
import { loadOpenApiSpec } from '../openapi/loader.js'

export function listMcpResources() {
  return [
    {
      uri: 'openapi://spec',
      name: 'OpenAPI Specification',
      description: 'Especificação OpenAPI completa carregada do projeto ativo.',
      mimeType: 'application/json',
    },
    {
      uri: 'infra://health-status',
      name: 'Status de Saúde da Infraestrutura',
      description: 'Snapshot consolidado de conectividade e status dos microsserviços.',
      mimeType: 'application/json',
    },
  ]
}

export async function readMcpResource(uri: string) {
  switch (uri) {
    case 'openapi://spec': {
      const spec = (await loadOpenApiSpec()) || {
        info: { title: 'No OpenAPI spec found', version: '0.0.0' },
        paths: {},
      }
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(spec, null, 2),
      }
    }

    case 'infra://health-status': {
      const diag = await runFullDiagnostics()
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(diag, null, 2),
      }
    }

    default:
      throw new Error(`Resource não encontrado para URI: ${uri}`)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm vitest packages/mcp-server/src/__tests__/resources.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/resources/ packages/mcp-server/src/__tests__/resources.test.ts
git commit -m "feat(mcp-server): add native MCP resources provider for openapi spec and health status"
```

---

### Task 5: Server Entrypoint Refactoring and Monorepo Integration

**Files:**
- Modify: `packages/mcp-server/src/index.ts`
- Modify: `packages/mcp-server/package.json`
- Test: Full scoped test suite

**Interfaces:**
- Consumes: All modules from Tasks 1-4.
- Produces: Complete Stdio MCP Server handling `ListTools`, `CallTool`, `ListResources`, `ReadResource`.

- [ ] **Step 1: Update `packages/mcp-server/src/index.ts`**

Rewrite `packages/mcp-server/src/index.ts`:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { getConfig, listEnvironments, setEnvironment } from './core/config.js'
import { maskSecret } from './core/sanitizer.js'
import { checkServiceHealth } from './infra/health.js'
import { executeApiRequest } from './openapi/executor.js'
import { discoverRoutes } from './openapi/parser.js'
import { listMcpResources, readMcpResource } from './resources/index.js'

/**
 * Servidor MCP Autônomo e Modular para OpenClaude e Antigravity
 */
const server = new Server(
  {
    name: 'scalar-mcp-server',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
)

/**
 * 1. Catálogo de Recursos Nativos
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: listMcpResources(),
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const result = await readMcpResource(request.params.uri)
  return {
    contents: [
      {
        uri: result.uri,
        mimeType: result.mimeType,
        text: result.text,
      },
    ],
  }
})

/**
 * 2. Catálogo de Ferramentas (Tools)
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'openapi_descobrir_rotas',
        description:
          'Busca e filtra rotas da API a partir da especificação OpenAPI local ou remota.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Termo de busca textual no path ou summary da rota',
            },
            tag: {
              type: 'string',
              description: 'Filtrar rotas pertencentes a uma tag OpenAPI específica',
            },
            metodo: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              description: 'Filtrar por método HTTP',
            },
          },
        },
      },
      {
        name: 'openapi_executar_requisicao',
        description:
          'Executa requisição HTTP REST autenticada contra os endpoints da API com sanitização de segurança.',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: {
              type: 'string',
              description: 'Caminho do endpoint relativo (ex: /usuarios, /pedidos/12)',
            },
            metodo: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              description: 'Método HTTP',
            },
            params: {
              type: 'object',
              description: 'Parâmetros de query string (opcional)',
            },
            payload: {
              type: 'object',
              description: 'Corpo da requisição em formato JSON (opcional)',
            },
            headers: {
              type: 'object',
              description: 'Headers HTTP adicionais (opcional)',
            },
            ambiente: {
              type: 'string',
              enum: ['local', 'dev', 'staging'],
              description: 'Sobrescrever o ambiente alvo para esta chamada (opcional)',
            },
          },
          required: ['endpoint', 'metodo'],
        },
      },
      {
        name: 'infra_diagnosticar_servico',
        description:
          'Executa teste de conectividade real (HTTP ping) medindo latência em ms e status do serviço.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL completa ou relativa a ser testada',
            },
            timeoutMs: {
              type: 'number',
              description: 'Tempo limite da requisição em milissegundos (padrão: 5000)',
            },
          },
        },
      },
      {
        name: 'ambiente_gerenciar',
        description:
          'Consulta, lista ou altera o ambiente ativo de execução (local, dev, staging).',
        inputSchema: {
          type: 'object',
          properties: {
            acao: {
              type: 'string',
              enum: ['listar', 'obter', 'trocar'],
              description: 'Ação a executar',
            },
            ambiente: {
              type: 'string',
              enum: ['local', 'dev', 'staging'],
              description: 'Nome do ambiente a ser ativado (obrigatório se acao=trocar)',
            },
          },
          required: ['acao'],
        },
      },
    ],
  }
})

/**
 * 3. Execução de Ferramentas
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params

  try {
    switch (name) {
      case 'openapi_descobrir_rotas': {
        const routes = await discoverRoutes(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ total: routes.length, rotas: routes }, null, 2),
            },
          ],
        }
      }

      case 'openapi_executar_requisicao': {
        const result = await executeApiRequest(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'infra_diagnosticar_servico': {
        const targetUrl = (args.url as string) || getConfig().url
        const timeoutMs = (args.timeoutMs as number) || 5000
        const result = await checkServiceHealth(targetUrl, timeoutMs)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'ambiente_gerenciar': {
        const { acao, ambiente } = args as { acao: string; ambiente?: any }

        if (acao === 'trocar' && ambiente) {
          const updated = setEnvironment(ambiente)
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    mensagem: `Ambiente alterado para '${ambiente}' com sucesso.`,
                    ativo: {
                      ...updated,
                      token: maskSecret(updated.token),
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        if (acao === 'listar') {
          const envs = listEnvironments()
          const sanitizedEnvs: Record<string, any> = {}
          for (const [k, v] of Object.entries(envs)) {
            sanitizedEnvs[k] = { ...v, token: maskSecret(v.token) }
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    ambienteAtivo: getConfig().name,
                    ambientes: sanitizedEnvs,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const current = getConfig()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ativo: {
                    ...current,
                    token: maskSecret(current.token),
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      default:
        throw new Error(`Ferramenta não reconhecida: ${name}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Erro ao executar ferramenta '${name}': ${message}`,
        },
      ],
    }
  }
})

/**
 * 4. Inicialização do transporte Stdio
 */
const transport = new StdioServerTransport()
await server.connect(transport)
```

- [ ] **Step 2: Run all scoped tests**

Run: `corepack pnpm vitest packages/mcp-server --run`
Expected: ALL PASS

- [ ] **Step 3: Verify JSON-RPC Protocol Live**

Run: `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | npx -y tsx packages/mcp-server/src/index.ts`
Expected: JSON-RPC response with `scalar-mcp-server` capabilities.

- [ ] **Step 4: Commit**

```bash
git add packages/mcp-server/
git commit -m "feat(mcp-server): wire modular core, openapi, infra, and native resources into stdio server"
```
