import { describe, expect, it } from 'vitest'

import { getConfig, listEnvironments, setEnvironment } from '../core/config.js'
import { maskSecret, sanitizeHeaders, sanitizePayload } from '../core/sanitizer.js'

describe('Core Sanitizer', () => {
  it('masks secret strings properly', () => {
    expect(maskSecret('secret-token-12345')).toBe('sec...2345')
    expect(maskSecret('short')).toBe('***')
  })

  it('sanitizes sensitive headers', () => {
    const headers = {
      Authorization: 'Bearer super-secret-key-999',
      'Content-Type': 'application/json',
      'X-Api-Key': 'key-12345678',
    }
    const sanitized = sanitizeHeaders(headers)
    expect(sanitized['Content-Type']).toBe('application/json')
    expect(sanitized['Authorization']).toContain('...')
    expect(sanitized['X-Api-Key']).toContain('...')
  })

  it('sanitizes objects containing sensitive payload keys', () => {
    const payload = {
      username: 'johndoe',
      password: 'mypassword123',
      nested: { api_key: 'topsecret' },
    }
    const sanitized = sanitizePayload(payload) as Record<string, any>
    expect(sanitized.username).toBe('johndoe')
    expect(sanitized.password).toBe('***')
    expect(sanitized.nested.api_key).toBe('***')
  })
})

describe('Core Config', () => {
  it('defaults to local environment and allows switching', () => {
    const initial = getConfig()
    expect(initial.name).toBe('local')
    expect(initial.url).toBeDefined()

    const updated = setEnvironment('staging')
    expect(updated.name).toBe('staging')
    expect(getConfig().name).toBe('staging')

    // Reset back
    setEnvironment('local')
  })

  it('lists configured environments', () => {
    const envs = listEnvironments()
    expect(envs.local).toBeDefined()
    expect(envs.dev).toBeDefined()
    expect(envs.staging).toBeDefined()
  })
})
