import { describe, expect, it } from 'vitest'

import { listMcpResources, readMcpResource } from '../resources/index.js'

describe('MCP Resources Provider', () => {
  it('lists registered resources', () => {
    const resources = listMcpResources()
    expect(resources.some((r) => r.uri === 'openapi://spec')).toBe(true)
    expect(resources.some((r) => r.uri === 'infra://health-status')).toBe(true)
  })

  it('reads infra health status resource as valid JSON string', async () => {
    const result = await readMcpResource('infra://health-status')
    expect(result.uri).toBe('infra://health-status')
    expect(result.mimeType).toBe('application/json')
    const parsed = JSON.parse(result.text)
    expect(parsed.activeEnvironment).toBeDefined()
  })
})
