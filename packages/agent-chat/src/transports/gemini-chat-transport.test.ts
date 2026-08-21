import { describe, expect, it, vi } from 'vitest'

import {
  GeminiChatTransport,
  convertMessagesToGemini,
  desanitizeToolName,
  formatToolsForGemini,
  sanitizeToolName,
} from './gemini-chat-transport'

describe('GeminiChatTransport', () => {
  it('converts user and assistant messages to Gemini Content structure', () => {
    const messages = [
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'List all pets' }] },
      { id: '2', role: 'assistant', parts: [{ type: 'text', text: 'Sure! Here they are.' }] },
    ]

    const contents = convertMessagesToGemini(messages as any)
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'List all pets' }] },
      { role: 'model', parts: [{ text: 'Sure! Here they are.' }] },
    ])
  })

  it('formats Scalar tools to Gemini functionDeclarations', () => {
    const tools = {
      'execute-request': {
        description: 'Execute HTTP request',
        parameters: {
          type: 'object',
          properties: {
            method: { type: 'string' },
            url: { type: 'string' },
          },
          required: ['method', 'url'],
        },
      },
    }

    const geminiTools = formatToolsForGemini(tools)
    expect(geminiTools).toBeDefined()
    expect(geminiTools?.[0]?.functionDeclarations[0]?.name).toBe('execute_request')
    expect(geminiTools?.[0]?.functionDeclarations[0]?.description).toBe('Execute HTTP request')
  })

  it('correctly sanitizes and desanitizes tool names', () => {
    expect(sanitizeToolName('execute-request')).toBe('execute_request')
    expect(sanitizeToolName('search-openapi-operations')).toBe('search_openapi_operations')
    expect(desanitizeToolName('execute_request')).toBe('execute-request')
    expect(desanitizeToolName('search_openapi_operations')).toBe('search-openapi-operations')
  })

  it('handles tool call parts and tool outputs in convertMessagesToGemini', () => {
    const messages = [
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'Get user 123' }] },
      {
        id: '2',
        role: 'assistant',
        parts: [
          {
            type: 'tool-execute-request',
            toolCallId: 'call_1',
            toolName: 'execute-request',
            input: { method: 'GET', path: '/users/123' },
            output: { status: 200, responseBody: { id: 123, name: 'Alice' } },
            state: 'output-available',
          },
        ],
      },
    ]

    const contents = convertMessagesToGemini(messages as any)
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'Get user 123' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'execute_request',
              args: { method: 'GET', path: '/users/123' },
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: 'execute_request',
              response: {
                output: { status: 200, responseBody: { id: 123, name: 'Alice' } },
              },
            },
          },
        ],
      },
    ])
  })

  it('streams SSE text responses correctly via sendMessages', async () => {
    const sseData = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}],"role":"model"}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":" world!"}],"role":"model"},"finishReason":"STOP"}]}\n\n',
    ].join('')

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        }),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      ),
    )

    const transport = new GeminiChatTransport({
      apiKey: 'test-api-key',
      model: 'gemini-3.7-flash',
      fetch: mockFetch,
    })

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      chatId: 'test-chat',
      messageId: undefined,
      abortSignal: undefined,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        } as any,
      ],
    })

    const reader = stream.getReader()
    const chunks: any[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(value)
    }

    expect(chunks.some((c) => c.type === 'text-start')).toBe(true)
    expect(chunks.some((c) => c.type === 'text-delta' && c.delta === 'Hello')).toBe(true)
    expect(chunks.some((c) => c.type === 'text-delta' && c.delta === ' world!')).toBe(true)
    expect(chunks.some((c) => c.type === 'text-end')).toBe(true)
    expect(chunks.some((c) => c.type === 'finish')).toBe(true)
  })

  it('streams tool call responses correctly via sendMessages', async () => {
    const sseData = [
      'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"execute_request","args":{"method":"GET","path":"/pets"}}}],"role":"model"},"finishReason":"STOP"}]}\n\n',
    ].join('')

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        }),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      ),
    )

    const transport = new GeminiChatTransport({
      apiKey: 'test-api-key',
      model: 'gemini-3.7-flash',
      fetch: mockFetch,
    })

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      chatId: 'test-chat',
      messageId: undefined,
      abortSignal: undefined,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'List pets' }],
        } as any,
      ],
    })

    const reader = stream.getReader()
    const chunks: any[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(value)
    }

    const toolChunk = chunks.find((c) => c.type === 'tool-input-available')
    expect(toolChunk).toBeDefined()
    expect(toolChunk.toolName).toBe('execute-request')
    expect(toolChunk.input).toEqual({ method: 'GET', path: '/pets' })
  })

  it('handles API error responses gracefully in sendMessages', async () => {
    const errorResponse = JSON.stringify({
      error: {
        code: 400,
        message: 'API key not valid. Please pass a valid API key.',
        status: 'INVALID_ARGUMENT',
      },
    })

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(errorResponse, {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const transport = new GeminiChatTransport({
      apiKey: 'bad-key',
      fetch: mockFetch,
    })

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      chatId: 'test-chat',
      messageId: undefined,
      abortSignal: undefined,
      messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] } as any],
    })

    const reader = stream.getReader()
    const chunks: any[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(value)
    }

    const errorChunk = chunks.find((c) => c.type === 'error')
    expect(errorChunk).toBeDefined()
    expect(errorChunk.errorText).toContain('API key not valid')
  })

  it('supports tools as array in formatToolsForGemini', () => {
    const tools = [
      {
        name: 'get-user',
        description: 'Get user by id',
        inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
      },
    ]

    const geminiTools = formatToolsForGemini(tools)
    expect(geminiTools).toEqual([
      {
        functionDeclarations: [
          {
            name: 'get_user',
            description: 'Get user by id',
            parameters: { type: 'object', properties: { id: { type: 'string' } } },
          },
        ],
      },
    ])
  })

  it('supports dynamic function options and systemInstruction', async () => {
    let capturedUrl = ''
    let capturedBody: any = null

    const mockFetch = vi.fn().mockImplementation((url, init) => {
      capturedUrl = url
      capturedBody = JSON.parse(init.body)
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}\n\n'),
              )
              controller.close()
            },
          }),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        ),
      )
    })

    const transport = new GeminiChatTransport({
      apiKey: () => 'dynamic-key-123',
      model: () => 'gemini-1.5-pro',
      systemInstruction: () => 'You are a helpful API assistant.',
      fetch: mockFetch,
    })

    await transport.sendMessages({
      trigger: 'submit-message',
      chatId: 'test-chat',
      messageId: undefined,
      abortSignal: undefined,
      messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hello' }] } as any],
    })

    expect(capturedUrl).toContain('models/gemini-1.5-pro:streamGenerateContent')
    expect(capturedUrl).toContain('key=dynamic-key-123')
    expect(capturedBody.systemInstruction).toEqual({
      parts: [{ text: 'You are a helpful API assistant.' }],
    })
  })
})
