import { getConfig, listEnvironments } from '../core/config.js'
import { sanitizeHeaders, sanitizePayload } from '../core/sanitizer.js'

export interface RequestExecutionParams {
  endpoint: string
  metodo: string
  params?: Record<string, string | number>
  payload?: Record<string, unknown>
  headers?: Record<string, string>
  ambiente?: 'local' | 'dev' | 'staging'
  timeoutMs?: number
}

export interface ExecutionResult {
  status: number
  statusText: string
  url: string
  durationMs: number
  headers: Record<string, string>
  data: unknown
}

export async function executeApiRequest(params: RequestExecutionParams): Promise<ExecutionResult> {
  const envConfig = params.ambiente ? listEnvironments()[params.ambiente] || getConfig() : getConfig()

  let urlStr = `${envConfig.url.replace(/\/$/, '')}/${params.endpoint.replace(/^\//, '')}`

  if (params.params && Object.keys(params.params).length > 0) {
    const query = new URLSearchParams()
    for (const [k, v] of Object.entries(params.params)) {
      query.append(k, String(v))
    }
    urlStr += `?${query.toString()}`
  }

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...params.headers,
  }

  if (envConfig.token && !reqHeaders.Authorization) {
    reqHeaders.Authorization = `Bearer ${envConfig.token}`
  }

  const controller = new AbortController()
  const timeoutMs = params.timeoutMs || 10000
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  const startTime = Date.now()

  try {
    const response = await fetch(urlStr, {
      method: params.metodo.toUpperCase(),
      headers: reqHeaders,
      body: params.payload ? JSON.stringify(params.payload) : undefined,
      signal: controller.signal,
    })

    const durationMs = Date.now() - startTime
    const bodyText = await response.text()
    let parsedBody: unknown = bodyText

    try {
      parsedBody = JSON.parse(bodyText)
    } catch {
      // Keep as string
    }

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val
    })

    return {
      status: response.status,
      statusText: response.statusText,
      url: urlStr,
      durationMs,
      headers: sanitizeHeaders(responseHeaders),
      data: sanitizePayload(parsedBody),
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
