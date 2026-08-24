import { describe, expect, it } from 'vitest'

import { diffOpenApi } from '../diff.js'
import { formatDiffMarkdown } from '../reporter.js'

describe('@scalar/openapi-diff', () => {
  const specV1 = {
    openapi: '3.1.0',
    info: { title: 'User API', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          summary: 'List users',
          parameters: [{ name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Success' },
            '500': { description: 'Server Error' },
          },
        },
        post: {
          summary: 'Create user',
          requestBody: { required: false },
          responses: {
            '201': { description: 'Created' },
          },
        },
      },
      '/users/{id}': {
        get: {
          summary: 'Get user by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'User found' },
          },
        },
      },
    },
  }

  it('detects no changes when comparing identical specs', () => {
    const result = diffOpenApi(specV1, specV1)
    expect(result.hasChanges).toBe(false)
    expect(result.recommendedBump).toBe('none')
    expect(result.totalChanges).toBe(0)
  })

  it('detects breaking changes when an endpoint is deleted', () => {
    const specV2 = {
      openapi: '3.1.0',
      info: { title: 'User API', version: '2.0.0' },
      paths: {
        '/users': specV1.paths['/users'],
      },
    }

    const result = diffOpenApi(specV1, specV2)
    expect(result.hasChanges).toBe(true)
    expect(result.breaking.length).toBe(1)
    expect(result.breaking[0].category).toBe('path')
    expect(result.breaking[0].location).toContain('/users/{id}')
    expect(result.recommendedBump).toBe('major')
  })

  it('detects non-breaking additions when a new endpoint or response is added', () => {
    const specV2 = {
      ...specV1,
      paths: {
        ...specV1.paths,
        '/health': {
          get: {
            summary: 'Healthcheck',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    }

    const result = diffOpenApi(specV1, specV2)
    expect(result.hasChanges).toBe(true)
    expect(result.breaking.length).toBe(0)
    expect(result.nonBreaking.length).toBe(1)
    expect(result.recommendedBump).toBe('minor')
  })

  it('detects breaking change when an optional parameter becomes required', () => {
    const specV2 = {
      ...specV1,
      paths: {
        ...specV1.paths,
        '/users': {
          ...specV1.paths['/users'],
          get: {
            ...specV1.paths['/users'].get,
            parameters: [{ name: 'limit', in: 'query', required: true, schema: { type: 'integer' } }],
          },
        },
      },
    }

    const result = diffOpenApi(specV1, specV2)
    expect(result.breaking.length).toBe(1)
    expect(result.breaking[0].category).toBe('parameter')
    expect(result.breaking[0].message).toContain('OBRIGATÓRIO')
    expect(result.recommendedBump).toBe('major')
  })

  it('detects deprecations properly', () => {
    const specV2 = {
      ...specV1,
      paths: {
        ...specV1.paths,
        '/users': {
          ...specV1.paths['/users'],
          get: {
            ...specV1.paths['/users'].get,
            deprecated: true,
          },
        },
      },
    }

    const result = diffOpenApi(specV1, specV2)
    expect(result.deprecated.length).toBe(1)
    expect(result.deprecated[0].action).toBe('deprecated')
  })

  it('formats Markdown changelog report correctly', () => {
    const specV2 = {
      openapi: '3.1.0',
      info: { title: 'User API', version: '2.0.0' },
      paths: {
        '/users': specV1.paths['/users'],
      },
    }

    const result = diffOpenApi(specV1, specV2)
    const report = formatDiffMarkdown(result)
    expect(report).toContain('Relatório de Mudanças Semânticas')
    expect(report).toContain('Breaking Changes')
    expect(report).toContain('MAJOR')
  })
})
