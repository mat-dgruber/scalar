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

/**
 * 2. Catálogo de Ferramentas (Tools)
 */
server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: [
      {
        name: 'openapi_descobrir_rotas',
        description: 'Busca e filtra rotas da API a partir da especificação OpenAPI local ou remota.',
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
        description: 'Executa teste de conectividade real (HTTP ping) medindo latência em ms e status do serviço.',
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
        description: 'Consulta, lista ou altera o ambiente ativo de execução (local, dev, staging).',
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
