import type { AgentProvider, GeminiConfig, GeminiModel } from '@scalar/types/api-reference'

export const STORAGE_KEY_GEMINI_CONFIG = 'scalar_agent_gemini_config'
export const STORAGE_KEY_AGENT_PROVIDER = 'scalar_agent_provider'
export const DEFAULT_GEMINI_MODEL: GeminiModel = 'gemini-3.7-flash'

/**
 * Reads and parses stored Agent Provider from localStorage.
 */
export function loadStoredAgentProvider(): AgentProvider | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_AGENT_PROVIDER)
    if (raw === 'scalar' || raw === 'gemini') {
      return raw
    }
    return null
  } catch {
    return null
  }
}

/**
 * Saves Agent Provider to localStorage.
 */
export function saveStoredAgentProvider(provider: AgentProvider): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY_AGENT_PROVIDER, provider)
  } catch (err) {
    console.warn('[AGENT]: Failed to save Agent Provider to localStorage', err)
  }
}

/**
 * Reads and parses stored Gemini configuration from localStorage.
 */
export function loadStoredGeminiConfig(): GeminiConfig | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_GEMINI_CONFIG)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }

    return parsed as GeminiConfig
  } catch {
    return null
  }
}

/**
 * Saves Gemini configuration to localStorage.
 */
export function saveStoredGeminiConfig(config: GeminiConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY_GEMINI_CONFIG, JSON.stringify(config))
  } catch (err) {
    console.warn('[AGENT]: Failed to save Gemini configuration to localStorage', err)
  }
}

/**
 * Clears stored Gemini configuration from localStorage.
 */
export function clearStoredGeminiConfig(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY_GEMINI_CONFIG)
  } catch (err) {
    console.warn('[AGENT]: Failed to clear Gemini configuration from localStorage', err)
  }
}

/**
 * Resolves the effective Gemini configuration by combining localStorage (highest precedence),
 * props configuration, and default fallbacks.
 */
export function getEffectiveGeminiConfig(propsConfig?: GeminiConfig): GeminiConfig {
  const stored = loadStoredGeminiConfig()

  return {
    apiKey: stored?.apiKey || propsConfig?.apiKey,
    model: stored?.model || propsConfig?.model || DEFAULT_GEMINI_MODEL,
    baseUrl: stored?.baseUrl || propsConfig?.baseUrl,
  }
}
