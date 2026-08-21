/**
 * @vitest-environment jsdom
 */
import { useModal } from '@scalar/components/modal'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { DEFAULT_GEMINI_MODEL, loadStoredGeminiConfig, saveStoredGeminiConfig } from '../../state/gemini-settings'
import AgentSettingsModal from './AgentSettingsModal.vue'

describe('AgentSettingsModal', () => {
  beforeEach(() => {
    global.ResizeObserver = class {
      observe() {
        // noop
      }
      unobserve() {
        // noop
      }
      disconnect() {
        // noop
      }
    } as any
    localStorage.clear()
    document.body.replaceChildren()
  })

  it('renders with default Gemini provider, default model, and Google AI Studio link', async () => {
    const modalState = useModal()
    modalState.show()

    mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Google Gemini')
    expect(document.body.textContent).toContain('Scalar Cloud')

    const link = document.body.querySelector('a[href="https://aistudio.google.com/app/apikey"]')
    expect(link).not.toBeNull()

    const modelSelect = document.body.querySelector('select[data-testid="gemini-model-select"]') as HTMLSelectElement
    expect(modelSelect).not.toBeNull()
    expect(modelSelect.value).toBe(DEFAULT_GEMINI_MODEL)
  })

  it('loads existing stored configuration from localStorage', async () => {
    saveStoredGeminiConfig({
      apiKey: 'AIzaSyExistingKey123',
      model: 'gemini-2.5-pro',
      baseUrl: 'https://custom-proxy.example.com',
    })

    const modalState = useModal()
    modalState.show()

    mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    const apiKeyInput = document.body.querySelector('input[data-testid="gemini-api-key-input"]') as HTMLInputElement
    expect(apiKeyInput).not.toBeNull()
    expect(apiKeyInput.value).toBe('AIzaSyExistingKey123')

    const modelSelect = document.body.querySelector('select[data-testid="gemini-model-select"]') as HTMLSelectElement
    expect(modelSelect.value).toBe('gemini-2.5-pro')
  })

  it('loads custom model from stored config when not in preset list', async () => {
    saveStoredGeminiConfig({
      apiKey: 'test-key',
      model: 'gemini-custom-fine-tuned',
    })

    const modalState = useModal()
    modalState.show()

    mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    const modelSelect = document.body.querySelector('select[data-testid="gemini-model-select"]') as HTMLSelectElement
    expect(modelSelect.value).toBe('custom')

    const customInput = document.body.querySelector(
      'input[data-testid="gemini-custom-model-input"]',
    ) as HTMLInputElement
    expect(customInput).not.toBeNull()
    expect(customInput.value).toBe('gemini-custom-fine-tuned')
  })

  it('toggles API key input masking between password and text', async () => {
    const modalState = useModal()
    modalState.show()

    mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    const apiKeyInput = document.body.querySelector('input[data-testid="gemini-api-key-input"]') as HTMLInputElement
    expect(apiKeyInput.getAttribute('type')).toBe('password')

    const toggleBtn = document.body.querySelector('[data-testid="toggle-api-key-visibility"]') as HTMLButtonElement
    expect(toggleBtn).not.toBeNull()

    toggleBtn.click()
    await nextTick()

    const updatedApiKeyInput = document.body.querySelector(
      'input[data-testid="gemini-api-key-input"]',
    ) as HTMLInputElement
    expect(updatedApiKeyInput.getAttribute('type')).toBe('text')

    toggleBtn.click()
    await nextTick()

    expect(updatedApiKeyInput.getAttribute('type')).toBe('password')
  })

  it('shows custom model input when custom option is selected', async () => {
    const modalState = useModal()
    modalState.show()

    mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    const modelSelect = document.body.querySelector('select[data-testid="gemini-model-select"]') as HTMLSelectElement
    expect(document.body.querySelector('input[data-testid="gemini-custom-model-input"]')).toBeNull()

    modelSelect.value = 'custom'
    modelSelect.dispatchEvent(new Event('change'))
    await nextTick()

    const customInput = document.body.querySelector('input[data-testid="gemini-custom-model-input"]')
    expect(customInput).not.toBeNull()
  })

  it('toggles advanced settings collapsible section', async () => {
    const modalState = useModal()
    modalState.show()

    mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    const advancedToggle = document.body.querySelector('[data-testid="toggle-advanced-settings"]') as HTMLButtonElement
    expect(advancedToggle).not.toBeNull()

    expect(document.body.querySelector('input[data-testid="gemini-base-url-input"]')).toBeNull()

    advancedToggle.click()
    await nextTick()

    expect(document.body.querySelector('input[data-testid="gemini-base-url-input"]')).not.toBeNull()
  })

  it('saves settings to localStorage, emits save event, and closes modal', async () => {
    const modalState = useModal()
    modalState.show()

    const wrapper = mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    const apiKeyInput = document.body.querySelector('input[data-testid="gemini-api-key-input"]') as HTMLInputElement
    apiKeyInput.value = 'AIzaSyNewSecretKey'
    apiKeyInput.dispatchEvent(new Event('input'))

    const modelSelect = document.body.querySelector('select[data-testid="gemini-model-select"]') as HTMLSelectElement
    modelSelect.value = 'gemini-3.1-pro'
    modelSelect.dispatchEvent(new Event('change'))

    const advancedToggle = document.body.querySelector('[data-testid="toggle-advanced-settings"]') as HTMLButtonElement
    advancedToggle.click()
    await nextTick()

    const baseUrlInput = document.body.querySelector('input[data-testid="gemini-base-url-input"]') as HTMLInputElement
    baseUrlInput.value = 'https://my-proxy.internal'
    baseUrlInput.dispatchEvent(new Event('input'))

    const saveButton = document.body.querySelector('[data-testid="save-settings-button"]') as HTMLButtonElement
    expect(saveButton).not.toBeNull()
    saveButton.click()
    await nextTick()

    const stored = loadStoredGeminiConfig()
    expect(stored).toEqual({
      apiKey: 'AIzaSyNewSecretKey',
      model: 'gemini-3.1-pro',
      baseUrl: 'https://my-proxy.internal',
    })

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      apiKey: 'AIzaSyNewSecretKey',
      model: 'gemini-3.1-pro',
      baseUrl: 'https://my-proxy.internal',
    })

    expect(modalState.open).toBe(false)
  })

  it('saves custom typed model when custom is selected', async () => {
    const modalState = useModal()
    modalState.show()

    mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    const modelSelect = document.body.querySelector('select[data-testid="gemini-model-select"]') as HTMLSelectElement
    modelSelect.value = 'custom'
    modelSelect.dispatchEvent(new Event('change'))
    await nextTick()

    const customInput = document.body.querySelector(
      'input[data-testid="gemini-custom-model-input"]',
    ) as HTMLInputElement
    customInput.value = 'gemini-experimental-preview'
    customInput.dispatchEvent(new Event('input'))

    const saveButton = document.body.querySelector('[data-testid="save-settings-button"]') as HTMLButtonElement
    saveButton.click()
    await nextTick()

    const stored = loadStoredGeminiConfig()
    expect(stored?.model).toBe('gemini-experimental-preview')
  })

  it('cancels and closes modal on click Cancelar', async () => {
    const modalState = useModal()
    modalState.show()

    const wrapper = mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    const cancelButton = document.body.querySelector('[data-testid="cancel-settings-button"]') as HTMLButtonElement
    expect(cancelButton).not.toBeNull()

    cancelButton.click()
    await nextTick()

    expect(modalState.open).toBe(false)
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('allows switching provider between Google Gemini and Scalar Cloud', async () => {
    const modalState = useModal()
    modalState.show()

    mount(AgentSettingsModal, {
      attachTo: document.body,
      props: {
        modalState,
      },
    })
    await flushPromises()

    const scalarCloudRadio = document.body.querySelector('input[value="scalar"]') as HTMLInputElement
    expect(scalarCloudRadio).not.toBeNull()
    scalarCloudRadio.checked = true
    scalarCloudRadio.dispatchEvent(new Event('change'))
    await nextTick()

    expect(document.body.querySelector('input[data-testid="gemini-api-key-input"]')).toBeNull()

    const geminiRadio = document.body.querySelector('input[value="gemini"]') as HTMLInputElement
    expect(geminiRadio).not.toBeNull()
    geminiRadio.checked = true
    geminiRadio.dispatchEvent(new Event('change'))
    await nextTick()

    expect(document.body.querySelector('input[data-testid="gemini-api-key-input"]')).not.toBeNull()
  })
})
