import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import { scalarMcp } from './mcp'

describe('Scalar Hono MCP Middleware', () => {
  it('responds with MCP server metadata on GET /mcp', async () => {
    const app = new Hono()
    app.all('/mcp', scalarMcp())

    const res = await app.request('/mcp', { method: 'GET' })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.name).toBe('scalar-hono-mcp-server')
    expect(data.protocolVersion).toBe('2024-11-05')
  })

  it('handles tools/list JSON-RPC 2.0 requests on POST /mcp', async () => {
    const app = new Hono()
    app.all('/mcp', scalarMcp())

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'req-1',
        method: 'tools/list',
      }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.jsonrpc).toBe('2.0')
    expect(data.id).toBe('req-1')
    expect(Array.isArray(data.result.tools)).toBe(true)
    expect(data.result.tools.length).toBeGreaterThan(0)
  })

  it('handles tools/call JSON-RPC 2.0 requests on POST /mcp', async () => {
    const app = new Hono()
    app.all('/mcp', scalarMcp())

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'req-2',
        method: 'tools/call',
        params: { name: 'openapi_descobrir_rotas' },
      }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.result.content[0].text).toContain('openapi_descobrir_rotas')
  })

  it('returns error for invalid jsonrpc version', async () => {
    const app = new Hono()
    app.all('/mcp', scalarMcp())

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '1.0',
        id: 'req-3',
        method: 'tools/list',
      }),
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe(-32600)
  })
})
