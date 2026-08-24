import { loadOpenApiSpec } from './loader.js'

export interface RouteSummary {
  path: string
  method: string
  summary: string
  tags?: string[]
  parameters?: Array<{ name: string; in: string; required?: boolean }>
}

export interface DiscoverOptions {
  spec?: Record<string, unknown>
  query?: string
  tag?: string
  metodo?: string
}

export async function discoverRoutes(options: DiscoverOptions = {}): Promise<RouteSummary[]> {
  const spec = options.spec || (await loadOpenApiSpec())
  if (!spec || !spec.paths || typeof spec.paths !== 'object') {
    return []
  }

  const results: RouteSummary[] = []
  const queryLower = options.query?.toLowerCase()
  const tagLower = options.tag?.toLowerCase()
  const methodUpper = options.metodo?.toUpperCase()

  for (const [path, methods] of Object.entries(spec.paths as Record<string, Record<string, any>>)) {
    if (!methods || typeof methods !== 'object') {
      continue
    }

    for (const [method, op] of Object.entries(methods)) {
      const httpMethod = method.toUpperCase()
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(httpMethod)) {
        continue
      }

      if (methodUpper && httpMethod !== methodUpper) {
        continue
      }

      const tags: string[] = op.tags || []
      if (tagLower && !tags.some((t) => t.toLowerCase().includes(tagLower))) {
        continue
      }

      const summary: string = op.summary || op.description || ''
      if (queryLower && !path.toLowerCase().includes(queryLower) && !summary.toLowerCase().includes(queryLower)) {
        continue
      }

      results.push({
        path,
        method: httpMethod,
        summary,
        tags,
        parameters: op.parameters,
      })
    }
  }

  return results
}
