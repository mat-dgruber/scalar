import { describe, expect, it } from 'vitest'

import { getActiveProxyUrl, getDefaultProxyUrl } from './proxy'

describe('getDefaultProxyUrl', () => {
  it('returns null by default to avoid leaking requests to external cloud proxy', () => {
    expect(getDefaultProxyUrl('web')).toBe(null)
  })

  it('returns null for other layout', () => {
    expect(getDefaultProxyUrl('other')).toBe(null)
  })
})

describe('getActiveProxyUrl', () => {
  it('returns the active proxy url if it is set', () => {
    expect(getActiveProxyUrl('https://custom-proxy.internal', 'web')).toBe('https://custom-proxy.internal')
  })

  it('returns null if the active proxy url is not set', () => {
    expect(getActiveProxyUrl(undefined, 'web')).toBe(null)
  })

  it('returns null if the active proxy url is set to null', () => {
    expect(getActiveProxyUrl(null, 'web')).toBe(null)
  })
})
