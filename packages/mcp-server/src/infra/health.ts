export interface HealthCheckResult {
  url: string
  status: 'UP' | 'DOWN'
  statusCode?: number
  durationMs: number
  timestamp: string
  error?: string
}

function validateHealthCheckUrl(targetUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    throw new Error(`URL inválida: ${targetUrl}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Protocolo não suportado: ${parsed.protocol}. Apenas http: e https: são permitidos.`)
  }

  const hostname = parsed.hostname.toLowerCase()

  // Bloqueio contra SSRF em instâncias de nuvem (AWS/GCP/Azure/OpenStack)
  if (
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data' ||
    hostname.endsWith('.internal')
  ) {
    throw new Error(`Acesso bloqueado por política de segurança SSRF: endpoint de metadados restrito (${hostname})`)
  }

  return parsed
}

export async function checkServiceHealth(targetUrl: string, timeoutMs = 5000): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  try {
    const validatedUrl = validateHealthCheckUrl(targetUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    try {
      const res = await fetch(validatedUrl.toString(), {
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
    } finally {
      clearTimeout(timeoutId)
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
  }
}
