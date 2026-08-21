import { coerce, validate } from '@scalar/validation'
import { describe, expect, it } from 'vitest'

import { agentConfigurationSchema, baseConfigurationSchema, geminiConfigSchema } from './base-configuration'

describe('gemini-configuration', () => {
  describe('geminiConfigSchema', () => {
    it('validates an empty gemini config', () => {
      const config = {}
      expect(validate(geminiConfigSchema, config)).toBe(true)
      expect(() => coerce(geminiConfigSchema, config)).not.toThrow()
    })

    it('validates a complete gemini config', () => {
      const config = {
        apiKey: 'test-api-key',
        model: 'gemini-3.7-flash',
        baseUrl: 'https://generativelanguage.googleapis.com',
      }
      expect(validate(geminiConfigSchema, config)).toBe(true)
      const result = coerce(geminiConfigSchema, config)
      expect(result).toMatchObject(config)
    })

    it('accepts all known gemini model identifiers', () => {
      const models = [
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.1-pro',
        'gemini-3.1-flash-lite',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'custom-model-name',
      ]

      for (const model of models) {
        const config = { model }
        expect(validate(geminiConfigSchema, config)).toBe(true)
        expect(coerce(geminiConfigSchema, config).model).toBe(model)
      }
    })
  })

  describe('agentConfigurationSchema', () => {
    it('validates an empty agent config', () => {
      const config = {}
      expect(validate(agentConfigurationSchema, config)).toBe(true)
      expect(() => coerce(agentConfigurationSchema, config)).not.toThrow()
    })

    it('validates scalar agent provider config', () => {
      const config = {
        provider: 'scalar',
        key: 'scalar-key-123',
      }
      expect(validate(agentConfigurationSchema, config)).toBe(true)
      const result = coerce(agentConfigurationSchema, config)
      expect(result).toMatchObject(config)
    })

    it('validates gemini agent provider config with nested gemini settings', () => {
      const config = {
        provider: 'gemini',
        key: 'scalar-key-optional',
        gemini: {
          apiKey: 'gemini-key-456',
          model: 'gemini-3.7-flash',
          baseUrl: 'https://proxy.example.com',
        },
      }
      expect(validate(agentConfigurationSchema, config)).toBe(true)
      const result = coerce(agentConfigurationSchema, config)
      expect(result).toMatchObject(config)
    })

    it('fails on invalid provider', () => {
      const config = {
        provider: 'unsupported-provider',
      }
      expect(validate(agentConfigurationSchema, config)).toBe(false)
    })
  })

  describe('baseConfigurationSchema with agent', () => {
    it('validates baseConfiguration without agent', () => {
      const config = {
        title: 'My API',
      }
      expect(() => coerce(baseConfigurationSchema, config)).not.toThrow()
      const result = coerce(baseConfigurationSchema, config)
      expect(result.agent).toBeUndefined()
    })

    it('validates baseConfiguration with gemini agent config', () => {
      const config = {
        title: 'My API',
        agent: {
          provider: 'gemini',
          gemini: {
            apiKey: 'AIzaSyExampleKey',
            model: 'gemini-3.7-flash',
          },
        },
      }
      expect(() => coerce(baseConfigurationSchema, config)).not.toThrow()
      const result = coerce(baseConfigurationSchema, config)
      expect(result.agent).toMatchObject(config.agent)
    })
  })
})
