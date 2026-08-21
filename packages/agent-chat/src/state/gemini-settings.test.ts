/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_GEMINI_MODEL,
  STORAGE_KEY_AGENT_PROVIDER,
  STORAGE_KEY_GEMINI_CONFIG,
  clearStoredGeminiConfig,
  getEffectiveGeminiConfig,
  loadStoredAgentProvider,
  loadStoredGeminiConfig,
  saveStoredAgentProvider,
  saveStoredGeminiConfig,
} from './gemini-settings'

describe('gemini-settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exports correct constants', () => {
    expect(STORAGE_KEY_GEMINI_CONFIG).toBe('scalar_agent_gemini_config')
    expect(STORAGE_KEY_AGENT_PROVIDER).toBe('scalar_agent_provider')
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.7-flash')
  })

  it('defaults to gemini-3.7-flash when no config is stored or passed', () => {
    const config = getEffectiveGeminiConfig()
    expect(config.model).toBe('gemini-3.7-flash')
    expect(config.apiKey).toBeUndefined()
    expect(config.baseUrl).toBeUndefined()
  })

  it('uses propsConfig when no localStorage config is present', () => {
    const config = getEffectiveGeminiConfig({
      apiKey: 'prop-api-key',
      model: 'gemini-3.6-flash',
      baseUrl: 'https://proxy.custom.io',
    })
    expect(config.apiKey).toBe('prop-api-key')
    expect(config.model).toBe('gemini-3.6-flash')
    expect(config.baseUrl).toBe('https://proxy.custom.io')
  })

  it('prefers localStorage settings over prop settings', () => {
    saveStoredGeminiConfig({
      apiKey: 'stored-key',
      model: 'gemini-2.5-pro',
    })

    const config = getEffectiveGeminiConfig({
      apiKey: 'prop-key',
      model: 'gemini-3.7-flash',
    })

    expect(config.apiKey).toBe('stored-key')
    expect(config.model).toBe('gemini-2.5-pro')
  })

  it('merges partial localStorage settings with propsConfig', () => {
    saveStoredGeminiConfig({
      apiKey: 'stored-key-only',
    })

    const config = getEffectiveGeminiConfig({
      apiKey: 'prop-key',
      model: 'gemini-2.5-flash',
      baseUrl: 'https://custom-gateway.io',
    })

    expect(config.apiKey).toBe('stored-key-only')
    expect(config.model).toBe('gemini-2.5-flash')
    expect(config.baseUrl).toBe('https://custom-gateway.io')
  })

  it('saves, loads, and clears stored Gemini config in localStorage', () => {
    expect(loadStoredGeminiConfig()).toBeNull()

    saveStoredGeminiConfig({
      apiKey: 'test-key',
      model: 'gemini-3.1-pro',
      baseUrl: 'https://example.com',
    })

    const loaded = loadStoredGeminiConfig()
    expect(loaded).toEqual({
      apiKey: 'test-key',
      model: 'gemini-3.1-pro',
      baseUrl: 'https://example.com',
    })

    clearStoredGeminiConfig()
    expect(loadStoredGeminiConfig()).toBeNull()
  })

  it('handles invalid JSON in localStorage safely without throwing', () => {
    localStorage.setItem(STORAGE_KEY_GEMINI_CONFIG, 'invalid-json{{{')

    expect(loadStoredGeminiConfig()).toBeNull()

    const config = getEffectiveGeminiConfig({
      apiKey: 'fallback-prop-key',
    })
    expect(config.apiKey).toBe('fallback-prop-key')
    expect(config.model).toBe('gemini-3.7-flash')
  })

  it('handles non-object JSON values in localStorage safely', () => {
    localStorage.setItem(STORAGE_KEY_GEMINI_CONFIG, JSON.stringify('just-a-string'))

    expect(loadStoredGeminiConfig()).toBeNull()
  })

  it('handles array JSON values in localStorage safely', () => {
    localStorage.setItem(STORAGE_KEY_GEMINI_CONFIG, JSON.stringify(['item1', 'item2']))

    expect(loadStoredGeminiConfig()).toBeNull()
  })

  it('handles localStorage errors gracefully in save and clear', () => {
    const originalSetItem = localStorage.setItem
    const originalRemoveItem = localStorage.removeItem

    localStorage.setItem = () => {
      throw new Error('Quota exceeded')
    }
    localStorage.removeItem = () => {
      throw new Error('Storage disabled')
    }

    expect(() => {
      saveStoredGeminiConfig({ apiKey: 'test' })
    }).not.toThrow()

    expect(() => {
      clearStoredGeminiConfig()
    }).not.toThrow()

    localStorage.setItem = originalSetItem
    localStorage.removeItem = originalRemoveItem
  })

  it('saves and loads stored agent provider', () => {
    expect(loadStoredAgentProvider()).toBeNull()

    saveStoredAgentProvider('gemini')
    expect(loadStoredAgentProvider()).toBe('gemini')

    saveStoredAgentProvider('scalar')
    expect(loadStoredAgentProvider()).toBe('scalar')
  })

  it('ignores invalid stored agent provider values', () => {
    localStorage.setItem(STORAGE_KEY_AGENT_PROVIDER, 'invalid-provider')
    expect(loadStoredAgentProvider()).toBeNull()
  })
})
