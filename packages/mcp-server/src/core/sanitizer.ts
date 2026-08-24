const SENSITIVE_HEADER_KEYS = [
  'authorization',
  'x-api-key',
  'api-key',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-auth-token',
]

const SENSITIVE_PAYLOAD_KEYS = [
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'client_secret',
  'private_key',
  'access_token',
  'refresh_token',
  'id_token',
  'jwt',
  'session_id',
  'session',
  'credential',
]

export function maskSecret(value: string): string {
  if (!value || typeof value !== 'string') {
    return '***'
  }
  return '***'
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
