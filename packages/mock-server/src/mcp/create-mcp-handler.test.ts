import { describe, expect, it } from 'vitest'

import { createMockServer } from '../create-mock-server'
import { extractMcpTools } from './create-mcp-handler'

describe('MCP (Model Context Protocol) Support in Mock Server', () => {
  const openApiDoc: any = {
    openapi: '3.1.0',
    info: {
      title: 'Pet Store API',
      version: '1.0.0',
    },
    paths: {
      '/pets': {
        get: {
          operationId: 'listPets',
          summary: 'List all pets',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            '200': {
              description: 'A list of pets',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Fido' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createPet',
          summary: 'Create a pet',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                  },
                  required: ['name'],
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Pet created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 2 },
                      name: { type: 'string', example: 'Fluffy' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }

  it('extracts MCP tools from OpenAPI document accurately', () => {
    const tools = extractMcpTools(openApiDoc)
    expect(tools).toHaveLength(2)

    const listPetsTool = tools.find((t) => t.name === 'listPets')
    expect(listPetsTool).toBeDefined()
    expect(listPetsTool?.description).toBe('List all pets')
    expect(listPetsTool?.inputSchema.properties?.limit).toBeDefined()

    const createPetTool = tools.find((t) => t.name === 'createPet')
    expect(createPetTool).toBeDefined()
    expect(createPetTool?.inputSchema.properties?.requestBody).toBeDefined()
    expect(createPetTool?.inputSchema.required).toContain('requestBody')
  })

  it('handles MCP JSON-RPC initialize and tools/list requests on /mcp', async () => {
    const app = await createMockServer({
      specification: openApiDoc,
    })

    // Test initialize
    const initRes = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
      }),
    })
    expect(initRes.status).toBe(200)
    const initData = await initRes.json()
    expect(initData.result.serverInfo.name).toBe('scalar-mcp-server')

    // Test tools/list
    const listRes = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
    })
    expect(listRes.status).toBe(200)
    const listData = await listRes.json()
    expect(listData.result.tools).toHaveLength(2)
    expect(listData.result.tools[0].name).toBe('listPets')
  })

  it('executes tools/call via JSON-RPC against the mock server route', async () => {
    const app = await createMockServer({
      specification: openApiDoc,
    })

    const callRes = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'listPets',
          arguments: { limit: 10 },
        },
      }),
    })

    expect(callRes.status).toBe(200)
    const callData = await callRes.json()
    expect(callData.result.isError).toBe(false)
    expect(callData.result.content[0].type).toBe('text')
    expect(callData.result.content[0].text).toContain('Fido')
  })

  it('serves resources/list and resources/read for OpenAPI schema', async () => {
    const app = await createMockServer({
      specification: openApiDoc,
    })

    const resList = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'resources/list',
      }),
    })
    const resListData = await resList.json()
    expect(resListData.result.resources[0].uri).toBe('openapi://specification')

    const resRead = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'resources/read',
        params: { uri: 'openapi://specification' },
      }),
    })
    const resReadData = await resRead.json()
    expect(resReadData.result.contents[0].text).toContain('Pet Store API')
  })
})
