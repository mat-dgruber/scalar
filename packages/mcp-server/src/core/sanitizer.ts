const SENSITIVE_HEADER_KEYS = ['authorization', 'x-api-key', 'api-key', 'cookie', 'set-cookie']

const SENSITIVE_PAYLOAD_KEYS = ['password', 'secret', 'token', 'api_key', 'apikey', 'client_secret', 'private_key']

export function maskSecret(value: string, visibleChars = 3): string {
  if (!value || typeof value !== 'string') {
    return '***'
  }
  if (value.length <= visibleChars * 2) {
    return '***'
  }
  const start = value.slice(0, visibleChars)
  const end = value.slice(-visibleChars - 1)
  return `${start}...${end}`
}

export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.includes(key.toLowerCase())) {
      result[key] = maskSecret(val)
    } else {
      result[key] = val
    }
  }
  return result
}

export function sanitizePayload(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data
  }
  if (typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item))
  }

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_PAYLOAD_KEYS.includes(key.toLowerCase())) {
      result[key] = '***'
    } else if (typeof val === 'object' && val !== null) {
      result[key] = sanitizePayload(val)
    } else {
      result[key] = val
    }
  }
  return result
}
