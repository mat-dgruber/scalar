import { describe, expect, it } from 'vitest'

import { diffOpenApiDocuments } from './diff-openapi'

describe('diffOpenApiDocuments', () => {
  it('detects no changes for identical documents', () => {
    const doc = {
      openapi: '3.1.0',
      paths: {
        '/users': {
          get: {
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    }

    const result = diffOpenApiDocuments(doc, doc)
    expect(result.hasBreakingChanges).toBe(false)
    expect(result.totalChanges).toBe(0)
    expect(result.diffs).toHaveLength(0)
  })

  it('detects breaking changes when endpoints or methods are removed', () => {
    const baseDoc = {
      openapi: '3.1.0',
      paths: {
        '/users': {
          get: { responses: { '200': { description: 'ok' } } },
          delete: { responses: { '204': { description: 'deleted' } } },
        },
        '/orders': {
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
    }

    const updatedDoc = {
      openapi: '3.1.0',
      paths: {
        '/users': {
          get: { responses: { '200': { description: 'ok' } } },
          // delete /users removed
        },
        // /orders removed
      },
    }

    const result = diffOpenApiDocuments(baseDoc, updatedDoc)
    expect(result.hasBreakingChanges).toBe(true)
    expect(result.breakingCount).toBe(2)
    expect(result.diffs.some((d) => d.message.includes('Endpoint completely removed: /orders'))).toBe(true)
    expect(result.diffs.some((d) => d.message.includes('Operation removed: DELETE /users'))).toBe(true)
    expect(result.markdownChangelog).toContain('Breaking Change(s) Detected')
  })

  it('detects added required parameters as breaking changes', () => {
    const baseDoc = {
      openapi: '3.1.0',
      paths: {
        '/search': {
          get: {
            parameters: [{ name: 'q', in: 'query', required: false }],
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    }

    const updatedDoc = {
      openapi: '3.1.0',
      paths: {
        '/search': {
          get: {
            parameters: [
              { name: 'q', in: 'query', required: true }, // changed to required
              { name: 'apiKey', in: 'header', required: true }, // new required param
            ],
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    }

    const result = diffOpenApiDocuments(baseDoc, updatedDoc)
    expect(result.hasBreakingChanges).toBe(true)
    expect(result.breakingCount).toBe(2)
  })

  it('detects new non-breaking endpoints and deprecations', () => {
    const baseDoc = {
      openapi: '3.1.0',
      paths: {
        '/legacy': {
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
    }

    const updatedDoc = {
      openapi: '3.1.0',
      paths: {
        '/legacy': {
          get: { deprecated: true, responses: { '200': { description: 'ok' } } },
        },
        '/v2/items': {
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
    }

    const result = diffOpenApiDocuments(baseDoc, updatedDoc)
    expect(result.hasBreakingChanges).toBe(false)
    expect(result.totalChanges).toBe(2)
    expect(result.diffs.some((d) => d.type === 'deprecated')).toBe(true)
    expect(result.diffs.some((d) => d.type === 'added' && d.path === '/v2/items')).toBe(true)
  })
})
