import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export async function loadOpenApiSpec(): Promise<Record<string, unknown> | null> {
  // 1. Env explicit path
  if (process.env.OPENAPI_SPEC_PATH && existsSync(process.env.OPENAPI_SPEC_PATH)) {
    try {
      const content = readFileSync(process.env.OPENAPI_SPEC_PATH, 'utf-8')
      return JSON.parse(content)
    } catch {
      // Fallback
    }
  }

  // 2. Local workspace files
  const candidateFiles = ['openapi.json', 'swagger.json', '.scalar/openapi.json', 'scalar.json']

  for (const file of candidateFiles) {
    const fullPath = join(process.cwd(), file)
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf-8')
        return JSON.parse(content)
      } catch {
        // Continue searching
      }
    }
  }

  // 3. Fallback to active Scalar dev server if reachable
  const scalarUrl = process.env.INTERNAL_API_URL || 'http://localhost:5052'
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, 2000)
    const res = await fetch(`${scalarUrl}/openapi.json`, { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      return (await res.json()) as Record<string, unknown>
    }
  } catch {
    // Dev server not reachable
  }

  return null
}
