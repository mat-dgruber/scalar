import { describe, expect, it } from 'vitest'

import { compressSpec, decompressSpec, generateSpecHashUrl, getSpecFromUrlHash } from './spec-compression'

describe('spec-compression', () => {
  const sampleSpec = JSON.stringify({
    openapi: '3.1.0',
    info: {
      title: 'Internal Standard OpenAPI Documentation Spec',
      description:
        'A comprehensive internal API specification designed to test spec compression and URL hash sharing helpers in Scalar.',
      version: '1.0.0',
    },
    paths: {
      '/health': {
        get: {
          summary: 'Health check endpoint',
          description: 'Returns the current status of all microservices, databases, and dependencies.',
          responses: {
            '200': {
              description: 'System healthy and responsive',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      uptime: { type: 'number', example: 123456 },
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-08-24T12:00:00Z',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  it('compresses and decompresses OpenAPI JSON correctly', async () => {
    const compressed = await compressSpec(sampleSpec)
    expect(typeof compressed).toBe('string')
    expect(compressed.length).toBeLessThan(sampleSpec.length)

    const decompressed = await decompressSpec(compressed)
    expect(decompressed).toBe(sampleSpec)
    expect(JSON.parse(decompressed)).toEqual(JSON.parse(sampleSpec))
  })

  it('generates a valid hash URL with #spec=', async () => {
    const url = await generateSpecHashUrl(sampleSpec, 'http://localhost:5054/docs')
    expect(url).toContain('http://localhost:5054/docs#spec=')

    const hash = url.split('#spec=')[1]
    const extracted = await getSpecFromUrlHash(`#spec=${hash}`)
    expect(extracted).toBe(sampleSpec)
  })

  it('returns null when hash does not contain spec', async () => {
    const result = await getSpecFromUrlHash('#other-tag')
    expect(result).toBeNull()
  })

  it('handles query param or search string style', async () => {
    const compressed = await compressSpec(sampleSpec)
    const result = await getSpecFromUrlHash(`?spec=${compressed}`)
    expect(result).toBe(sampleSpec)
  })

  it('handles corrupt data gracefully', async () => {
    const result = await getSpecFromUrlHash('#spec=invalidbase64content')
    expect(result).toBeNull()
  })
})
