import { describe, expect, it } from 'vitest'

import { isLocalUrl } from './is-local-url'

describe('isLocalUrl ', () => {
  it('returns true for localhost', () => {
    expect(isLocalUrl('http://localhost')).toBe(true)
    expect(isLocalUrl('https://localhost')).toBe(true)
  })

  it('returns true for 127.0.0.1', () => {
    expect(isLocalUrl('http://127.0.0.1')).toBe(true)
    expect(isLocalUrl('https://127.0.0.1')).toBe(true)
  })

  it('returns true for [::1]', () => {
    expect(isLocalUrl('http://[::1]')).toBe(true)
    expect(isLocalUrl('https://[::1]')).toBe(true)
  })

  it('returns true for 0.0.0.0', () => {
    expect(isLocalUrl('http://0.0.0.0')).toBe(true)
    expect(isLocalUrl('https://0.0.0.0')).toBe(true)
  })

  /**
   * @see https://en.wikipedia.org/wiki/.test
   */
  describe('reserved tlds', () => {
    it('returns true for reserved test tld', () => {
      expect(isLocalUrl('http://foobar.test')).toBe(true)
      expect(isLocalUrl('https://foobar.test')).toBe(true)
    })

    it('returns true for reserved example tld', () => {
      expect(isLocalUrl('http://foobar.example')).toBe(true)
      expect(isLocalUrl('https://foobar.example')).toBe(true)
    })

    it('returns true for reserved invalid tld', () => {
      expect(isLocalUrl('http://foobar.invalid')).toBe(true)
      expect(isLocalUrl('https://foobar.invalid')).toBe(true)
    })

    it('returns true for reserved local tld', () => {
      expect(isLocalUrl('http://foobar.localhost')).toBe(true)
      expect(isLocalUrl('https://foobar.localhost')).toBe(true)
    })
  })

  it('returns false for non-local URLs', () => {
    expect(isLocalUrl('http://example.com')).toBe(false)
    expect(isLocalUrl('https://google.com')).toBe(false)
  })

  it('returns true for private/intranet IP addresses (RFC 1918)', () => {
    expect(isLocalUrl('http://192.168.1.1')).toBe(true)
    expect(isLocalUrl('https://10.0.0.1')).toBe(true)
    expect(isLocalUrl('http://10.93.15.216:8001')).toBe(true)
    expect(isLocalUrl('http://172.16.0.1:3000')).toBe(true)
  })

  it('returns false for public non-local IP addresses', () => {
    expect(isLocalUrl('http://8.8.8.8')).toBe(false)
    expect(isLocalUrl('https://1.1.1.1')).toBe(false)
  })

  it('handles URLs with ports', () => {
    expect(isLocalUrl('http://localhost:3000')).toBe(true)
    expect(isLocalUrl('https://127.0.0.1:8080')).toBe(true)
  })

  it('handles URLs with paths and query parameters', () => {
    expect(isLocalUrl('http://localhost/api/data')).toBe(true)
    expect(isLocalUrl('https://127.0.0.1/search?q=test')).toBe(true)
  })

  it('returns true for relative file paths', () => {
    expect(isLocalUrl('openapi.json')).toBe(true)
  })
})
