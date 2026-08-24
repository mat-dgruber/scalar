import { Server } from '@modelcontextprotocol/sdk/server/index.js'
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
import type { GeneratorOptions } from './openapi/generator.js'
import { generateMcpToolsFromOpenApi } from './openapi/generator.js'
import { discoverRoutes } from './openapi/parser.js'
import { listMcpResources, readMcpResource } from './resources/index.js'

export interface ScalarMcpServerOptions extends GeneratorOptions {
  name?: string
  version?: string
  enableDefaultTools?: boolean
  enableDynamicTools?: boolean
}

/**
 * Fábrica para instanciar servidores MCP Scalar com ferramentas dinâmicas e estáticas
 */
export async function createScalarMcpServer(options: ScalarMcpServerOptions = {}) {
  const server = new Server(
    {
      name: options.name || 'scalar-mcp-server',
      version: options.version || '1.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  )

  // 1. Recursos Nativos
  server.setRequestHandler(ListResourcesRequestSchema, () => {
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

  // 2. Descoberta de Ferramentas
  const dynamicTools = options.enableDynamicTools !== false ? await generateMcpToolsFromOpenApi(options) : []
  const dynamicToolsMap = new Map(dynamicTools.map((t) => [t.name, t]))

  server.setRequestHandler(ListToolsRequestSchema, () => {
    const defaultTools =
      options.enableDefaultTools !== false
        ? [
            {
              name: 'openapi_descobrir_rotas',
              description: 'Busca e filtra rotas da API a partir da especificação OpenAPI local ou remota.',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Termo de busca textual' },
                  tag: { type: 'string', description: 'Filtrar por tag OpenAPI' },
                  metodo: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
                },
              },
            },
            {
              name: 'openapi_executar_requisicao',
              description: 'Executa requisição HTTP REST autenticada contra os endpoints da API com sanitização.',
              inputSchema: {
                type: 'object',
                properties: {
                  endpoint: { type: 'string', description: 'Caminho relativo (ex: /usuarios)' },
                  metodo: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
                  params: { type: 'object', description: 'Query parameters' },
                  payload: { type: 'object', description: 'Corpo da requisição JSON' },
                  headers: { type: 'object', description: 'Headers adicionais' },
                  ambiente: { type: 'string', enum: ['local', 'dev', 'staging'] },
                },
                required: ['endpoint', 'metodo'],
              },
            },
            {
              name: 'infra_diagnosticar_servico',
              description: 'Executa teste de conectividade real medindo latência em ms.',
              inputSchema: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: 'URL a ser testada' },
                  timeoutMs: { type: 'number', description: 'Timeout em ms' },
                },
              },
            },
            {
              name: 'ambiente_gerenciar',
              description: 'Consulta, lista ou altera o ambiente ativo de execução.',
              inputSchema: {
                type: 'object',
                properties: {
                  acao: { type: 'string', enum: ['listar', 'obter', 'trocar'] },
                  ambiente: { type: 'string', enum: ['local', 'dev', 'staging'] },
                },
                required: ['acao'],
              },
            },
          ]
        : []

    const exposedDynamicTools = dynamicTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }))

    return {
      tools: [...defaultTools, ...exposedDynamicTools],
    }
  })

  // 3. Execução de Ferramentas
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params

    try {
      // Verifica se é uma ferramenta dinâmica gerada da OpenAPI
      if (dynamicToolsMap.has(name)) {
        const tool = dynamicToolsMap.get(name)!
        const { payload, ambiente, ...params } = args as Record<string, any>

        // Substituir parâmetros de path no endpoint
        let endpoint = tool.route.path
        const queryParams: Record<string, string | number> = {}

        for (const [key, val] of Object.entries(params)) {
          if (endpoint.includes(`{${key}}`)) {
            endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(String(val)))
          } else {
            queryParams[key] = val
          }
        }

        const result = await executeApiRequest({
          endpoint,
          metodo: tool.route.method,
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
          payload,
          ambiente,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      // Ferramentas Padrão
      switch (name) {
        case 'openapi_descobrir_rotas': {
          const routes = await discoverRoutes(args as any)
          return {
            content: [{ type: 'text', text: JSON.stringify({ total: routes.length, rotas: routes }, null, 2) }],
          }
        }

        case 'openapi_executar_requisicao': {
          const result = await executeApiRequest(args as any)
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          }
        }

        case 'infra_diagnosticar_servico': {
          const targetUrl = (args.url as string) || getConfig().url
          const timeoutMs = (args.timeoutMs as number) || 5000
          const result = await checkServiceHealth(targetUrl, timeoutMs)
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
                      ativo: { ...updated, token: maskSecret(updated.token) },
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
                  text: JSON.stringify({ ambienteAtivo: getConfig().name, ambientes: sanitizedEnvs }, null, 2),
                },
              ],
            }
          }

          const current = getConfig()
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ ativo: { ...current, token: maskSecret(current.token) } }, null, 2),
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
        content: [{ type: 'text', text: `Erro ao executar ferramenta '${name}': ${message}` }],
      }
    }
  })

  return server
}
