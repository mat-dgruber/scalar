import type { OpenAPIV3_1 } from '@scalar/openapi-types'
import { getResolvedRef } from '@scalar/workspace-store/helpers/get-resolved-ref'
import type { Context, Hono } from 'hono'

import type { HttpMethod } from '@/types'
import { getOperations } from '@/utils/get-operation'

export interface McpTool {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, any>
    required?: string[]
  }
  _metadata?: {
    method: HttpMethod
    path: string
  }
}

/**
 * Extracts MCP-compliant tool definitions from an OpenAPI specification
 */
export function extractMcpTools(schema: OpenAPIV3_1.Document): McpTool[] {
  const tools: McpTool[] = []
  const paths = schema?.paths ?? {}

  for (const [path, pathItemRaw] of Object.entries(paths)) {
    const pathItem = getResolvedRef(pathItemRaw)
    const operations = getOperations(pathItem)

    for (const [method, operationRaw] of Object.entries(operations)) {
      const operation = getResolvedRef(operationRaw) as OpenAPIV3_1.OperationObject
      if (!operation) {
        continue
      }

      // Generate a normalized tool name
      const name =
        operation.operationId?.replace(/[^a-zA-Z0-9_-]/g, '_') ||
        `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '')}`

      const description = operation.summary || operation.description || `${method.toUpperCase()} ${path}`

      const properties: Record<string, any> = {}
      const required: string[] = []

      // Path and query parameters
      const pathParams = Array.isArray(pathItem?.parameters) ? pathItem.parameters : []
      const opParams = Array.isArray(operation?.parameters) ? operation.parameters : []
      const parameters = [...pathParams, ...opParams]

      for (const paramRaw of parameters) {
        const param = getResolvedRef(paramRaw) as OpenAPIV3_1.ParameterObject
        if (param?.name) {
          const resolvedParamSchema = getResolvedRef(param.schema)
          properties[param.name] = {
            ...(typeof resolvedParamSchema === 'object' && resolvedParamSchema !== null
              ? resolvedParamSchema
              : { type: 'string' }),
            description: param.description,
          }
          if (param.required) {
            required.push(param.name)
          }
        }
      }

      // Request body
      if (operation.requestBody) {
        const reqBody = getResolvedRef(operation.requestBody) as OpenAPIV3_1.RequestBodyObject
        const jsonContent = reqBody?.content?.['application/json']
        if (jsonContent?.schema) {
          const bodySchema = getResolvedRef(jsonContent.schema)
          properties.requestBody = bodySchema
          if (reqBody.required) {
            required.push('requestBody')
          }
        }
      }

      tools.push({
        name,
        description,
        inputSchema: {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined,
        },
        _metadata: {
          method: method as HttpMethod,
          path,
        },
      })
    }
  }

  return tools
}

/**
 * Creates an MCP (Model Context Protocol) JSON-RPC handler for a mock server
 */
export function createMcpHandler(app: Hono, schema: OpenAPIV3_1.Document) {
  const tools = extractMcpTools(schema)

  return async (c: Context) => {
    let body: any
    try {
      body = await c.req.json()
    } catch {
      return c.json(
        {
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error: invalid JSON' },
          id: null,
        },
        400,
      )
    }

    const { id, method, params } = body

    switch (method) {
      case 'initialize': {
        return c.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
            },
            serverInfo: {
              name: 'scalar-mcp-server',
              version: '1.0.0',
            },
          },
        })
      }

      case 'notifications/initialized': {
        return c.json({ jsonrpc: '2.0', id, result: {} })
      }

      case 'ping': {
        return c.json({ jsonrpc: '2.0', id, result: {} })
      }

      case 'tools/list': {
        const sanitizedTools = tools.map(({ _metadata, ...tool }) => tool)
        return c.json({
          jsonrpc: '2.0',
          id,
          result: { tools: sanitizedTools },
        })
      }

      case 'tools/call': {
        const toolName = params?.name
        const toolArgs = params?.arguments ?? {}

        const tool = tools.find((t) => t.name === toolName)
        if (!tool || !tool._metadata) {
          return c.json({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Tool not found: ${toolName}`,
            },
          })
        }

        const { method: httpMethod, path: rawPath } = tool._metadata

        // Replace path parameters in url
        let targetPath = rawPath
        const queryParams = new URLSearchParams()

        for (const [key, value] of Object.entries(toolArgs)) {
          if (key === 'requestBody') {
            continue
          }
          if (targetPath.includes(`{${key}}`)) {
            targetPath = targetPath.replace(`{${key}}`, encodeURIComponent(String(value)))
          } else {
            queryParams.append(key, String(value))
          }
        }

        const queryString = queryParams.toString()
        const url = `http://localhost${targetPath}${queryString ? `?${queryString}` : ''}`

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        const init: RequestInit = {
          method: httpMethod.toUpperCase(),
          headers,
        }

        if (toolArgs.requestBody && (httpMethod as string) !== 'get' && (httpMethod as string) !== 'head') {
          init.body = JSON.stringify(toolArgs.requestBody)
        }

        try {
          const response = await app.request(url, init)
          const text = await response.text()
          let parsedData: any
          try {
            parsedData = JSON.parse(text)
          } catch {
            parsedData = text
          }

          return c.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData, null, 2),
                },
              ],
              isError: !response.ok,
            },
          })
        } catch (err: any) {
          return c.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Mock request execution failed: ${err?.message || 'Unknown error'}`,
                },
              ],
              isError: true,
            },
          })
        }
      }

      case 'resources/list': {
        return c.json({
          jsonrpc: '2.0',
          id,
          result: {
            resources: [
              {
                uri: 'openapi://specification',
                name: 'OpenAPI Specification',
                description: schema.info?.title || 'OpenAPI document for this API',
                mimeType: 'application/json',
              },
            ],
          },
        })
      }

      case 'resources/read': {
        const uri = params?.uri
        if (uri === 'openapi://specification') {
          return c.json({
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri: 'openapi://specification',
                  mimeType: 'application/json',
                  text: JSON.stringify(schema, null, 2),
                },
              ],
            },
          })
        }
        return c.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Resource not found: ${uri}` },
        })
      }

      default: {
        return c.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        })
      }
    }
  }
}
