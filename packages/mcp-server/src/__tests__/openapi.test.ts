import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { executeApiRequest } from '../openapi/executor.js'
import { loadOpenApiSpec } from '../openapi/loader.js'
import { discoverRoutes } from '../openapi/parser.js'

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

  it('returns empty array when paths is missing or invalid', async () => {
    expect(await discoverRoutes({ spec: {} })).toEqual([])
    expect(await discoverRoutes({ spec: { paths: null as any } })).toEqual([])
  })
})

describe('OpenAPI Spec Loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads spec from dev server fallback when reachable', async () => {
    const mockSpec = { openapi: '3.1.0', info: { title: 'Dev API' } }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSpec,
      }),
    )

    const spec = await loadOpenApiSpec()
    expect(spec).toEqual(mockSpec)
  })
})

describe('API Request Executor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('executes API request and sanitizes sensitive data', async () => {
    const mockHeaders = new Headers({
      'content-type': 'application/json',
      authorization: 'Bearer sensitive-token-123456789',
    })

    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: mockHeaders,
      text: async () =>
        JSON.stringify({
          message: 'sucesso',
          token: 'secret-token-val',
          password: 'mypassword',
        }),
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    const result = await executeApiRequest({
      endpoint: '/usuarios',
      metodo: 'GET',
      params: { limit: 10 },
      ambiente: 'local',
    })

    expect(result.status).toBe(200)
    expect(result.url).toContain('/usuarios?limit=10')
    expect(result.headers.authorization).not.toBe('Bearer sensitive-token-123456789')
    expect((result.data as any).password).toBe('***')
    expect((result.data as any).token).toBe('***')
    expect((result.data as any).message).toBe('sucesso')
  })
})
