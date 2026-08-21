import type { GeminiConfig, GeminiModel } from '@scalar/types/api-reference'
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'

export type { GeminiConfig, GeminiModel }

export interface GeminiPart {
  text?: string
  functionCall?: {
    name: string
    args?: Record<string, any>
  }
  functionResponse?: {
    name: string
    response: Record<string, any>
  }
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export interface GeminiToolDeclaration {
  functionDeclarations: Array<{
    name: string
    description?: string
    parameters?: any
  }>
}

export interface GeminiChatTransportOptions {
  apiKey?: string | (() => string | undefined)
  model?: GeminiModel | string | (() => GeminiModel | string | undefined)
  baseUrl?: string | (() => string | undefined)
  systemInstruction?: string | (() => string | undefined)
  tools?: Record<string, any> | any[] | (() => Record<string, any> | any[] | undefined)
  fetch?: typeof fetch
  maxRetries?: number | (() => number | undefined)
  retryDelayMs?: number | (() => number | undefined)
  maxPayloadSizeBytes?: number | (() => number | undefined)
}

export const DEFAULT_MAX_PAYLOAD_SIZE = 50 * 1024 // 50 KB

/**
 * Truncate massive tool response outputs to prevent token exhaustion and context window overflows
 */
export function sanitizeToolOutput(output: any, maxBytes = DEFAULT_MAX_PAYLOAD_SIZE): any {
  if (output === null || output === undefined) {
    return output
  }

  if (typeof output === 'string') {
    if (output.length > maxBytes) {
      return `${output.slice(0, maxBytes)}\n... [Truncated: output exceeded ${Math.round(maxBytes / 1024)}KB context limit]`
    }
    return output
  }

  try {
    const serialized = JSON.stringify(output)
    if (serialized && serialized.length > maxBytes) {
      if (typeof output === 'object' && !Array.isArray(output)) {
        const truncatedObj: Record<string, any> = { ...output }
        if (truncatedObj.responseBody !== undefined) {
          const bodyStr =
            typeof truncatedObj.responseBody === 'string'
              ? truncatedObj.responseBody
              : JSON.stringify(truncatedObj.responseBody)
          truncatedObj.responseBody = `${bodyStr.slice(0, Math.min(maxBytes, 4000))}\n... [Truncated: responseBody exceeded context limit]`
        } else if (truncatedObj.data !== undefined) {
          const dataStr = typeof truncatedObj.data === 'string' ? truncatedObj.data : JSON.stringify(truncatedObj.data)
          truncatedObj.data = `${dataStr.slice(0, Math.min(maxBytes, 4000))}\n... [Truncated: data exceeded context limit]`
        } else {
          return {
            _warning: `Payload truncated because size (${serialized.length} bytes) exceeded ${maxBytes} bytes limit`,
            summary: `${serialized.slice(0, maxBytes)}...`,
          }
        }
        return truncatedObj
      }
      return {
        _warning: `Payload truncated because size (${serialized.length} bytes) exceeded ${maxBytes} bytes limit`,
        summary: `${serialized.slice(0, maxBytes)}...`,
      }
    }
  } catch {
    // If serialization fails, pass through
  }

  return output
}

export function sanitizeToolName(name: string): string {
  return name.replace(/-/g, '_')
}

export function desanitizeToolName(name: string): string {
  return name.replace(/_/g, '-')
}

/**
 * Format Scalar/JSON Schema tools into Gemini's tool declaration structure
 */
export function formatToolsForGemini(tools?: Record<string, any> | any[]): GeminiToolDeclaration[] | undefined {
  if (!tools) {
    return undefined
  }

  const declarations: Array<{
    name: string
    description?: string
    parameters?: any
  }> = []

  if (Array.isArray(tools)) {
    for (const tool of tools) {
      if (!tool?.name) {
        continue
      }
      declarations.push({
        name: sanitizeToolName(tool.name),
        description: tool.description,
        parameters: tool.parameters ?? tool.inputSchema,
      })
    }
  } else if (typeof tools === 'object') {
    for (const [name, tool] of Object.entries(tools)) {
      if (!tool) {
        continue
      }
      declarations.push({
        name: sanitizeToolName(name),
        description: tool.description,
        parameters: tool.parameters ?? tool.inputSchema,
      })
    }
  }

  if (declarations.length === 0) {
    return undefined
  }

  return [{ functionDeclarations: declarations }]
}

/**
 * Converts AI SDK UIMessages into Gemini contents format
 */
export function convertMessagesToGemini(messages: UIMessage<any, any, any>[]): GeminiContent[] {
  const contents: GeminiContent[] = []

  for (const message of messages) {
    if (message.role === 'user') {
      const parts: GeminiPart[] = []
      if (Array.isArray(message.parts)) {
        for (const part of message.parts) {
          if (part.type === 'text' && typeof part.text === 'string') {
            parts.push({ text: part.text })
          }
        }
      }
      if (parts.length === 0 && typeof (message as any).content === 'string') {
        parts.push({ text: (message as any).content })
      }
      if (parts.length > 0) {
        contents.push({ role: 'user', parts })
      }
    } else if (message.role === 'assistant') {
      const modelParts: GeminiPart[] = []
      const toolResponseParts: GeminiPart[] = []

      if (Array.isArray(message.parts)) {
        for (const part of message.parts) {
          if (part.type === 'text' && typeof part.text === 'string') {
            modelParts.push({ text: part.text })
          } else if (part.type.startsWith('tool-') || (part as any).toolName || (part as any).toolCallId) {
            const rawToolName =
              (part as any).toolName ||
              (part as any).toolInvocation?.toolName ||
              (part.type.startsWith('tool-') ? part.type.replace(/^tool-/, '') : '')
            const sanitizedName = sanitizeToolName(rawToolName)
            const args = (part as any).input ?? (part as any).args ?? (part as any).toolInvocation?.args ?? {}

            modelParts.push({
              functionCall: {
                name: sanitizedName,
                args,
              },
            })

            const rawOutput = (part as any).output ?? (part as any).result ?? (part as any).toolInvocation?.result
            if (rawOutput !== undefined) {
              const output = sanitizeToolOutput(rawOutput)
              toolResponseParts.push({
                functionResponse: {
                  name: sanitizedName,
                  response: { output },
                },
              })
            }
          }
        }
      }

      if (modelParts.length === 0 && typeof (message as any).content === 'string') {
        modelParts.push({ text: (message as any).content })
      }

      if (modelParts.length > 0) {
        contents.push({ role: 'model', parts: modelParts })
      }

      if (toolResponseParts.length > 0) {
        contents.push({ role: 'user', parts: toolResponseParts })
      }
    }
  }

  return contents
}

/**
 * ChatTransport implementation for Google Gemini API supporting BYOK, streaming, and tool calls.
 */
export class GeminiChatTransport implements ChatTransport<UIMessage<any, any, any>> {
  private options: GeminiChatTransportOptions

  constructor(options: GeminiChatTransportOptions = {}) {
    this.options = options
  }

  private resolveOption<T>(opt?: T | (() => T)): T | undefined {
    if (typeof opt === 'function') {
      return (opt as () => T)()
    }
    return opt
  }

  reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return Promise.resolve(null)
  }

  async sendMessages(
    options: Parameters<ChatTransport<UIMessage<any, any, any>>['sendMessages']>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    const rawApiKey = this.resolveOption(this.options.apiKey)
    const rawModel = this.resolveOption(this.options.model) || 'gemini-3.7-flash'
    const rawBaseUrl = this.resolveOption(this.options.baseUrl) || 'https://generativelanguage.googleapis.com'
    const rawSystemInstruction = this.resolveOption(this.options.systemInstruction)
    const rawTools = this.resolveOption(this.options.tools)
    const maxRetries = Math.max(0, this.resolveOption(this.options.maxRetries) ?? 3)
    const baseRetryDelay = Math.max(50, this.resolveOption(this.options.retryDelayMs) ?? 1000)
    const fetchFn = this.options.fetch ?? fetch

    const baseUrl = rawBaseUrl.replace(/\/+$/, '')
    const apiKey = rawApiKey?.trim() ?? ''
    const model = rawModel

    const contents = convertMessagesToGemini(options.messages)
    const tools = formatToolsForGemini(rawTools)

    const payload: Record<string, any> = {
      contents,
    }

    if (tools && tools.length > 0) {
      payload.tools = tools
    }

    if (rawSystemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: rawSystemInstruction }],
      }
    }

    const endpoint = baseUrl.includes(':streamGenerateContent')
      ? baseUrl
      : `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse${apiKey ? `&key=${apiKey}` : ''}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-goog-api-key': apiKey } : {}),
      ...(options.headers as Record<string, string>),
    }

    const isRetryable = (status: number) => {
      return status === 429 || status === 500 || status === 502 || status === 503 || status === 504
    }

    let response: Response | undefined
    let lastNetworkError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (options.abortSignal?.aborted) {
          break
        }

        response = await fetchFn(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: options.abortSignal,
        })

        if (response.ok || !isRetryable(response.status) || attempt === maxRetries) {
          break
        }

        const jitter = Math.random() * 100
        const delay = baseRetryDelay * Math.pow(2, attempt) + jitter
        await new Promise((resolve) => setTimeout(resolve, delay))
      } catch (err: any) {
        lastNetworkError = err
        if (options.abortSignal?.aborted || attempt === maxRetries) {
          break
        }
        const jitter = Math.random() * 100
        const delay = baseRetryDelay * Math.pow(2, attempt) + jitter
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    if (!response) {
      const errorMsg = lastNetworkError?.message || 'Network request failed after retries'
      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          controller.enqueue({ type: 'error', errorText: `Gemini API network error: ${errorMsg}` })
          controller.close()
        },
      })
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown network error')
      let message = `Gemini API error (${response.status}): ${response.statusText}`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          message = `Gemini API error: ${errorJson.error.message}`
        }
      } catch {
        if (errorText) {
          message = `Gemini API error: ${errorText}`
        }
      }

      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          controller.enqueue({ type: 'error', errorText: message })
          controller.close()
        },
      })
    }

    const bodyStream = response.body
    if (!bodyStream) {
      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          controller.enqueue({ type: 'error', errorText: 'Response body is empty' })
          controller.close()
        },
      })
    }

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        const reader = bodyStream.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let textPartStarted = false
        const textPartId = 'text_0'
        let hasToolCalls = false

        const processLine = (line: string) => {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) {
            return
          }

          const jsonStr = trimmed.slice(5).trim()
          if (!jsonStr) {
            return
          }

          try {
            const data = JSON.parse(jsonStr)
            const candidates = data.candidates || []
            for (const candidate of candidates) {
              const parts = candidate.content?.parts || []
              for (const part of parts) {
                if (part.text) {
                  if (!textPartStarted) {
                    textPartStarted = true
                    controller.enqueue({
                      type: 'text-start',
                      id: textPartId,
                    })
                  }
                  controller.enqueue({
                    type: 'text-delta',
                    id: textPartId,
                    delta: part.text,
                  })
                }

                if (part.functionCall) {
                  hasToolCalls = true
                  const toolCallId = `call_${Math.random().toString(36).slice(2, 11)}`
                  const originalToolName = desanitizeToolName(part.functionCall.name)

                  controller.enqueue({
                    type: 'tool-input-start',
                    toolCallId,
                    toolName: originalToolName,
                  })
                  controller.enqueue({
                    type: 'tool-input-available',
                    toolCallId,
                    toolName: originalToolName,
                    input: part.functionCall.args ?? {},
                  })
                }
              }
            }
          } catch {
            // Ignore parse errors on partial frames
          }
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              processLine(line)
            }
          }

          if (buffer.trim()) {
            processLine(buffer)
          }

          if (textPartStarted) {
            controller.enqueue({
              type: 'text-end',
              id: textPartId,
            })
          }

          controller.enqueue({
            type: 'finish-step',
          })
          controller.enqueue({
            type: 'finish',
            finishReason: hasToolCalls ? 'tool-calls' : 'stop',
          })
        } catch (err: any) {
          controller.enqueue({
            type: 'error',
            errorText: err?.message || 'Streaming failed',
          })
        } finally {
          controller.close()
        }
      },
    })
  }
}
