import { getConfig, listEnvironments } from '../core/config.js'
import { type HealthCheckResult, checkServiceHealth } from './health.js'

export interface FullDiagnosticsResult {
  timestamp: string
  activeEnvironment: string
  services: HealthCheckResult[]
  nodeVersion: string
  uptimeSeconds: number
}

export async function runFullDiagnostics(): Promise<FullDiagnosticsResult> {
  const envs = listEnvironments()
  const current = getConfig()
  const checkTargets = [current.url, envs.local.url, envs.dev.url].filter((url, idx, arr) => {
    return arr.indexOf(url) === idx && Boolean(url)
  })

  const checks = await Promise.all(
    checkTargets.map((url) => {
      return checkServiceHealth(url, 3000)
    }),
  )

  return {
    timestamp: new Date().toISOString(),
    activeEnvironment: current.name,
    services: checks,
    nodeVersion: process.version,
    uptimeSeconds: process.uptime(),
  }
}
