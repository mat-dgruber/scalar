# @scalar/mcp-server

[![Version](https://img.shields.io/npm/v/@scalar/mcp-server)](https://www.npmjs.com/package/@scalar/mcp-server)
[![License](https://img.shields.io/npm/l/@scalar/mcp-server)](https://www.npmjs.com/package/@scalar/mcp-server)
[![Discord](https://img.shields.io/discord/1135330207960678410?style=flat&color=5865F2)](https://discord.gg/scalar)

Autonomous and extensible **Model Context Protocol (MCP)** server for **Scalar**, **Antigravity**, **OpenClaude**, **Cursor**, and **Copilot**.

---

## Features

- 🛠️ **Dynamic OpenAPI Tool Generation:** Automatically turns all routes in any OpenAPI 3.0/3.1 document into strongly-typed MCP tools.
- 🛡️ **Zero-Trust Security & Sanitization:** Built-in secret masking and authorization header protections.
- ⚡ **Programmatic Factory:** Use `createScalarMcpServer()` to embed MCP servers inside any TypeScript application or CLI.
- 🌐 **Dual Transport Support:** Runs via standard I/O (`stdio`) or HTTP/SSE JSON-RPC 2.0 endpoints.

---

## Installation

```bash
pnpm add @scalar/mcp-server
```

---

## CLI Usage (Stdio)

Run directly with your active OpenAPI document:

```bash
# Via tsx or node
OPENAPI_SPEC_PATH=./openapi.json npx @scalar/mcp-server
```

---

## Programmatic Usage

```typescript
import { createScalarMcpServer, generateMcpToolsFromOpenApi } from '@scalar/mcp-server'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

// 1. Create MCP server from an OpenAPI document
const server = await createScalarMcpServer({
  name: 'my-custom-api-mcp',
  spec: myOpenApiSpecObject,
  readOnly: false, // Set true to only expose GET routes as tools
})

// 2. Connect transport
const transport = new StdioServerTransport()
await server.connect(transport)
```

---

## License

MIT License.
