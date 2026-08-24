import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createScalarMcpServer } from './server.js'

export * from './core/config.js'
export * from './core/sanitizer.js'
export * from './infra/health.js'
export * from './openapi/executor.js'
export * from './openapi/generator.js'
export * from './openapi/loader.js'
export * from './openapi/parser.js'
export * from './resources/index.js'
export * from './server.js'

/**
 * Ponto de entrada Stdio para execução direta (CLI / Antigravity / OpenClaude)
 */
async function main() {
  const isDirectRun = import.meta.url === `file://${process.argv[1]}`
  if (isDirectRun || process.env.SCALAR_MCP_AUTOSTART === 'true') {
    const server = await createScalarMcpServer()
    const transport = new StdioServerTransport()
    await server.connect(transport)
  }
}

main().catch((err) => {
  console.error('Falha crítica ao iniciar Scalar MCP Server:', err)
  process.exit(1)
})
