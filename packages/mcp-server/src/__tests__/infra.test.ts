import { afterEach, describe, expect, it, vi } from 'vitest'

import { runFullDiagnostics } from '../infra/diagnostics.js'
import { checkServiceHealth } from '../infra/health.js'

describe('Infra Healthcheck Engine', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns structured DOWN status for unreachable URLs gracefully without throwing', async () => {
    const result = await checkServiceHealth('http://127.0.0.1:59999/health', 500)
    expect(result.status).toBe('DOWN')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.error).toBeDefined()
  })

  it('returns structured UP status for reachable URLs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('OK', { status: 200 }))

    const result = await checkServiceHealth('http://localhost:5052/health', 1000)
    expect(result.status).toBe('UP')
    expect(result.statusCode).toBe(200)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.error).toBeUndefined()
  })

  it('runs full diagnostics across active environments', async () => {
    const diagnostics = await runFullDiagnostics()

    expect(diagnostics.timestamp).toBeDefined()
    expect(diagnostics.activeEnvironment).toBeDefined()
    expect(Array.isArray(diagnostics.services)).toBe(true)
    expect(diagnostics.services.length).toBeGreaterThan(0)
    expect(diagnostics.nodeVersion).toBe(process.version)
    expect(diagnostics.uptimeSeconds).toBeGreaterThan(0)
  })
})
