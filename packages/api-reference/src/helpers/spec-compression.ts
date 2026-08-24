/**
 * Compresses an OpenAPI JSON string using Gzip and encodes to URL-safe Base64.
 */
export async function compressSpec(jsonString: string): Promise<string> {
  const stream = new Blob([jsonString]).stream().pipeThrough(new CompressionStream('gzip'))
  const response = new Response(stream)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decodes a URL-safe Base64 string and decompresses via Gzip.
 */
export async function decompressSpec(base64Url: string): Promise<string> {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  const response = new Response(stream)
  return await response.text()
}

/**
 * Generates a full URL containing the compressed spec in the hash fragment.
 */
export async function generateSpecHashUrl(jsonString: string, originAndPath?: string): Promise<string> {
  const compressed = await compressSpec(jsonString)
  const base =
    originAndPath ?? (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '')
  return `${base}#spec=${compressed}`
}

/**
 * Extracts and decompresses the OpenAPI spec from a URL hash or query string.
 */
export async function getSpecFromUrlHash(hashOrSearch?: string): Promise<string | null> {
  const raw = hashOrSearch ?? (typeof window !== 'undefined' ? window.location.hash : '')
  if (!raw) {
    return null
  }

  const match = raw.match(/[#&?]spec=([^&]+)/)
  if (!match || !match[1]) {
    return null
  }

  try {
    return await decompressSpec(decodeURIComponent(match[1]))
  } catch (err) {
    console.error('Failed to decompress spec from URL hash:', err)
    return null
  }
}
