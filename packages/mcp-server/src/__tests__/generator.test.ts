import { describe, expect, it } from 'vitest'

import { formatToolName, generateMcpToolsFromOpenApi } from '../openapi/generator.js'

describe('MCP Dynamic Tool Generator', () => {
  const mockSpec = {
    openapi: '3.1.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/usuarios': {
        get: {
          summary: 'Listar usuários',
          tags: ['Usuarios'],
          parameters: [{ name: 'limit', in: 'query', required: false }],
        },
        post: {
          summary: 'Criar usuário',
          tags: ['Usuarios'],
        },
      },
      '/pedidos/{id}': {
        get: {
          summary: 'Obter pedido',
          tags: ['Pedidos'],
          parameters: [{ name: 'id', in: 'path', required: true }],
        },
        delete: {
          summary: 'Excluir pedido',
          tags: ['Pedidos'],
          parameters: [{ name: 'id', in: 'path', required: true }],
        },
      },
    },
  }

  it('formats tool names cleanly from HTTP method and path', () => {
    expect(formatToolName('GET', '/usuarios')).toBe('get_usuarios')
    expect(formatToolName('POST', '/usuarios')).toBe('post_usuarios')
    expect(formatToolName('GET', '/pedidos/{id}')).toBe('get_pedidos_id')
    expect(formatToolName('GET', '/v1/users/{userId}/posts/{postId}')).toBe('get_v1_users_userid_posts_postid')
    expect(formatToolName('GET', '/usuarios', 'api')).toBe('api_get_usuarios')
  })

  it('generates tools with proper schemas for routes and parameters', async () => {
    const tools = await generateMcpToolsFromOpenApi({ spec: mockSpec })
    expect(tools.length).toBe(4)

    const getUsuariosTool = tools.find((t) => t.name === 'get_usuarios')
    expect(getUsuariosTool).toBeDefined()
    expect(getUsuariosTool?.inputSchema.properties.limit).toBeDefined()

    const postUsuariosTool = tools.find((t) => t.name === 'post_usuarios')
    expect(postUsuariosTool).toBeDefined()
    expect(postUsuariosTool?.inputSchema.properties.payload).toBeDefined()

    const getPedidosTool = tools.find((t) => t.name === 'get_pedidos_id')
    expect(getPedidosTool).toBeDefined()
    expect(getPedidosTool?.inputSchema.required).toContain('id')
  })

  it('respects readOnly filter and only generates GET tools', async () => {
    const tools = await generateMcpToolsFromOpenApi({ spec: mockSpec, readOnly: true })
    expect(tools.length).toBe(2)
    expect(tools.every((t) => t.route.method === 'GET')).toBe(true)
  })
})
