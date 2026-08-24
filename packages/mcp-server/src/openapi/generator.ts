import type { DiscoverOptions, RouteSummary } from './parser.js'
import { discoverRoutes } from './parser.js'

export interface DynamicMcpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  route: RouteSummary
}

export interface GeneratorOptions extends DiscoverOptions {
  readOnly?: boolean
  prefix?: string
}

/**
 * Converte um caminho OpenAPI (ex: /usuarios/{id}) e método em um nome válido para ferramenta MCP (ex: get_usuarios_id)
 */
export function formatToolName(method: string, path: string, prefix = ''): string {
  const sanitizedPath = path
    .replace(/^\//, '')
    .replace(/[{}]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase()

  const baseName = `${method.toLowerCase()}_${sanitizedPath}`.replace(/_+/g, '_').replace(/_$/, '')
  return prefix ? `${prefix}_${baseName}` : baseName
}

/**
 * Gera dinamicamente ferramentas MCP tipadas para cada rota da especificação OpenAPI
 */
export async function generateMcpToolsFromOpenApi(options: GeneratorOptions = {}): Promise<DynamicMcpTool[]> {
  const routes = await discoverRoutes(options)
  const tools: DynamicMcpTool[] = []

  for (const route of routes) {
    if (options.readOnly && route.method !== 'GET') {
      continue
    }

    const toolName = formatToolName(route.method, route.path, options.prefix)
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    // 1. Extração de Parâmetros (Path, Query, Header)
    if (route.parameters && Array.isArray(route.parameters)) {
      for (const param of route.parameters) {
        if (!param || !param.name) continue
        const desc = `Parâmetro de ${param.in}: ${param.name}`
        properties[param.name] = {
          type: 'string',
          description: desc,
        }
        if (param.required || param.in === 'path') {
          required.push(param.name)
        }
      }
    }

    // 2. Parâmetro de Payload (para POST/PUT/PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
      properties.payload = {
        type: 'object',
        description: 'Corpo da requisição em formato JSON',
      }
    }

    // 3. Parâmetro de Ambiente opcional
    properties.ambiente = {
      type: 'string',
      enum: ['local', 'dev', 'staging'],
      description: 'Ambiente de execução (opcional)',
    }

    tools.push({
      name: toolName,
      description: route.summary || `${route.method} ${route.path}`,
      inputSchema: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
      route,
    })
  }

  return tools
}
