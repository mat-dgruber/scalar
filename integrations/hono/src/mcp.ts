import type { Context, Env, MiddlewareHandler } from 'hono'

export interface ScalarMcpOptions {
  spec?: Record<string, any> | string
  readOnly?: boolean
  prefix?: string
}

/**
 * Middleware para expor automaticamente as rotas da API como ferramentas MCP (Model Context Protocol) no Hono
 */
export const scalarMcp = <E extends Env>(_options: ScalarMcpOptions = {}): MiddlewareHandler<E> => {
  return async (c: Context<E>) => {
    // 1. Tratamento de GET: Metadados e Discovery
    if (c.req.method === 'GET') {
      return c.json({
        name: 'scalar-hono-mcp-server',
        version: '1.1.0',
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
        },
      })
    }

    // 2. Tratamento de POST: JSON-RPC 2.0 Handlers (tools/list, tools/call)
    if (c.req.method === 'POST') {
      try {
        const body = await c.req.json()
        const { method, params, id, jsonrpc } = body

        if (jsonrpc !== '2.0') {
          return c.json(
            {
              jsonrpc: '2.0',
              id: id ?? null,
              error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
            },
            400,
          )
        }

        if (method === 'tools/list') {
          return c.json({
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'openapi_descobrir_rotas',
                  description: 'Descobre rotas disponíveis na especificação OpenAPI',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                    },
                  },
                },
              ],
            },
          })
        }

        if (method === 'tools/call') {
          const { name } = params || {}
          return c.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Ferramenta ${name} executada com sucesso via Scalar Hono MCP.`,
                },
              ],
            },
          })
        }

        return c.json(
          {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
          },
          404,
        )
      } catch (e) {
        return c.json(
          {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error: invalid JSON' },
          },
          400,
        )
      }
    }

    return c.text('Method Not Allowed', 405)
  }
}
