export interface HealthCheckResult {
  url: string
  status: 'UP' | 'DOWN'
  statusCode?: number
  durationMs: number
  timestamp: string
  error?: string
}

export async function checkServiceHealth(targetUrl: string, timeoutMs = 5000): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
    })

    const durationMs = Date.now() - startTime
    return {
      url: targetUrl,
      status: res.ok || res.status < 500 ? 'UP' : 'DOWN',
      statusCode: res.status,
      durationMs,
      timestamp,
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const message = err instanceof Error ? err.message : String(err)
    return {
      url: targetUrl,
      status: 'DOWN',
      durationMs,
      timestamp,
      error: message,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
