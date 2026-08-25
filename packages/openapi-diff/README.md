# @scalar/openapi-diff

[![Version](https://img.shields.io/npm/v/@scalar/openapi-diff)](https://www.npmjs.com/package/@scalar/openapi-diff)
[![Downloads](https://img.shields.io/npm/dm/@scalar/openapi-diff)](https://www.npmjs.com/package/@scalar/openapi-diff)
[![License](https://img.shields.io/npm/l/@scalar/openapi-diff)](https://www.npmjs.com/package/@scalar/openapi-diff)
[![Discord](https://img.shields.io/discord/1135330207960678410?style=flat&color=5865F2)](https://discord.gg/scalar)

Semantic diff and breaking change analyzer for OpenAPI specifications (v2.0, v3.0, v3.1).

---

## Features

- 🔍 **Semantic Analysis:** Detects breaking and non-breaking changes across routes, HTTP methods, parameters, request bodies, and responses.
- 🏷️ **SemVer Recommendation:** Automatically suggests the appropriate SemVer bump (`MAJOR`, `MINOR`, `PATCH`, `NONE`).
- 📝 **Markdown Reports:** Generates clean visual changelogs ready for GitHub Actions, GitLab CI, and PR comments.
- ⚡ **Zero External Heavy Dependencies:** Fast and lightweight TypeScript library.

---

## Installation

```bash
pnpm add @scalar/openapi-diff
```

---

## Usage

### Basic Comparison

```typescript
import { diffOpenApi, formatDiffMarkdown } from '@scalar/openapi-diff'

const oldSpec = {
  openapi: '3.1.0',
  paths: {
    '/users': {
      get: { summary: 'List users' }
    }
  }
}

const newSpec = {
  openapi: '3.1.0',
  paths: {
    '/users': {
      get: { summary: 'List users' },
      post: { summary: 'Create user' }
    }
  }
}

const diff = diffOpenApi(oldSpec, newSpec)

console.log(`Has changes: ${diff.hasChanges}`) // true
console.log(`SemVer Recommendation: ${diff.recommendedBump}`) // 'minor'
console.log(`Breaking changes count: ${diff.breaking.length}`) // 0
console.log(`Non-breaking count: ${diff.nonBreaking.length}`) // 1

// Generate Markdown Changelog Report
console.log(formatDiffMarkdown(diff))
```

### CI/CD Breaking Change Gate

```typescript
import { diffOpenApi } from '@scalar/openapi-diff'
import { readFileSync } from 'node:fs'

const oldSpec = JSON.parse(readFileSync('./openapi.prod.json', 'utf-8'))
const newSpec = JSON.parse(readFileSync('./openapi.dev.json', 'utf-8'))

const result = diffOpenApi(oldSpec, newSpec)

if (result.breaking.length > 0) {
  console.error('🚨 Breaking changes detected!')
  for (const change of result.breaking) {
    console.error(`- [${change.category.toUpperCase()}] ${change.location}: ${change.message}`)
  }
  process.exit(1)
}
```

---

## License

MIT License.
