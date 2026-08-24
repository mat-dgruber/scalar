import { describe, expect, it } from 'vitest'

import { dereferenceAsync } from './dereference-async'

describe('dereferenceAsync', () => {
  it('dereferences simple openapi document asynchronously without blocking', async () => {
    const spec = {
      openapi: '3.1.0',
      info: { title: 'Async Test', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    }

    const result = await dereferenceAsync(spec)
    expect(result.errors).toEqual([])
    expect((result.schema as any).paths['/users'].get.responses['200'].content['application/json'].schema.type).toBe(
      'object',
    )
  })
})
