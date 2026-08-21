<script setup lang="ts">
import { ScalarButton } from '@scalar/components/button'
import { ScalarIconButton } from '@scalar/components/icon-button'
import { ScalarModal, type ModalState } from '@scalar/components/modal'
import {
  ScalarIconCaretDown,
  ScalarIconCaretRight,
  ScalarIconEye,
  ScalarIconEyeSlash,
  ScalarIconGear,
} from '@scalar/icons'
import type {
  AgentProvider,
  GeminiConfig,
  GeminiModel,
} from '@scalar/types/api-reference'
import { computed, ref, watch } from 'vue'

import {
  DEFAULT_GEMINI_MODEL,
  loadStoredAgentProvider,
  loadStoredGeminiConfig,
  saveStoredAgentProvider,
  saveStoredGeminiConfig,
} from '@/state/gemini-settings'

const PRESET_MODELS: GeminiModel[] = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-pro',
  'gemini-3.1-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
]

const props = defineProps<{
  modalState?: ModalState
  modal?: ModalState
}>()

const emit = defineEmits<{
  (e: 'save', config: GeminiConfig, provider: AgentProvider): void
  (e: 'close'): void
}>()

const activeModal = computed(() => props.modalState ?? props.modal)

const provider = ref<AgentProvider>('gemini')
const apiKey = ref('')
const selectedModel = ref<string>(DEFAULT_GEMINI_MODEL)
const customModel = ref('')
const baseUrl = ref('')
const showApiKey = ref(false)
const showAdvanced = ref(false)

function initFromStorage() {
  const storedProvider = loadStoredAgentProvider()
  if (storedProvider) {
    provider.value = storedProvider
  }

  const storedConfig = loadStoredGeminiConfig()
  apiKey.value = storedConfig?.apiKey ?? ''
  baseUrl.value = storedConfig?.baseUrl ?? ''

  const model = storedConfig?.model ?? DEFAULT_GEMINI_MODEL
  if (PRESET_MODELS.includes(model as GeminiModel)) {
    selectedModel.value = model
    customModel.value = ''
  } else {
    selectedModel.value = 'custom'
    customModel.value = model
  }
}

// Initialize on setup
initFromStorage()

// Re-initialize when modal opens
watch(
  () => activeModal.value?.open,
  (isOpen) => {
    if (isOpen) {
      initFromStorage()
    }
  },
)

function handleSave() {
  const finalModel =
    selectedModel.value === 'custom'
      ? customModel.value.trim() || DEFAULT_GEMINI_MODEL
      : selectedModel.value

  const configToSave: GeminiConfig = {
    apiKey: apiKey.value.trim() || undefined,
    model: finalModel,
    baseUrl: baseUrl.value.trim() || undefined,
  }

  saveStoredGeminiConfig(configToSave)
  saveStoredAgentProvider(provider.value)

  emit('save', configToSave, provider.value)
  activeModal.value?.hide()
}

function handleCancel() {
  activeModal.value?.hide()
  emit('close')
}
</script>

<template>
  <ScalarModal
    v-if="activeModal"
    class="agentSettingsModal"
    :state="activeModal"
    title="Agent Settings">
    <div class="settingsHeader">
      <div class="flex items-center gap-2">
        <ScalarIconGear class="text-c-1 size-5" />
        <h2 class="text-c-1 text-base font-semibold">Agent Settings</h2>
      </div>
    </div>

    <div class="settingsBody flex flex-col gap-5 p-4 text-sm">
      <!-- Provider Selection -->
      <div class="flex flex-col gap-2">
        <label class="text-c-1 font-medium">Provider</label>
        <div class="providerOptions flex gap-3">
          <label
            class="providerOption border-border text-c-1 hover:bg-b-2 flex cursor-pointer items-center gap-2 rounded border px-3 py-2">
            <input
              v-model="provider"
              name="agent-provider"
              type="radio"
              value="gemini" />
            <span>Google Gemini</span>
          </label>
          <label
            class="providerOption border-border text-c-1 hover:bg-b-2 flex cursor-pointer items-center gap-2 rounded border px-3 py-2">
            <input
              v-model="provider"
              name="agent-provider"
              type="radio"
              value="scalar" />
            <span>Scalar Cloud</span>
          </label>
        </div>
      </div>

      <!-- Gemini Settings -->
      <template v-if="provider === 'gemini'">
        <!-- API Key Input -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label
              class="text-c-1 font-medium"
              for="gemini-api-key">
              Gemini API Key
            </label>
            <a
              class="text-c-2 hover:text-c-1 text-xs underline"
              href="https://aistudio.google.com/app/apikey"
              rel="noopener noreferrer"
              target="_blank">
              Get API key from Google AI Studio
            </a>
          </div>

          <div class="relative flex items-center">
            <input
              id="gemini-api-key"
              v-model="apiKey"
              autocomplete="off"
              class="border-border bg-b-1 text-c-1 focus:border-c-1 w-full rounded border px-3 py-2 pr-10 outline-none"
              data-testid="gemini-api-key-input"
              placeholder="AIzaSy..."
              spellcheck="false"
              :type="showApiKey ? 'text' : 'password'" />
            <ScalarIconButton
              class="text-c-2 hover:text-c-1 absolute right-1"
              data-testid="toggle-api-key-visibility"
              :icon="showApiKey ? ScalarIconEyeSlash : ScalarIconEye"
              :label="showApiKey ? 'Hide API key' : 'Show API key'"
              size="sm"
              type="button"
              variant="ghost"
              @click="showApiKey = !showApiKey" />
          </div>
        </div>

        <!-- Model Selection -->
        <div class="flex flex-col gap-1.5">
          <label
            class="text-c-1 font-medium"
            for="gemini-model-select">
            Model
          </label>
          <select
            id="gemini-model-select"
            v-model="selectedModel"
            class="border-border bg-b-1 text-c-1 focus:border-c-1 w-full rounded border px-3 py-2 outline-none"
            data-testid="gemini-model-select">
            <optgroup label="Frontier (3.x)">
              <option value="gemini-3.7-flash">
                gemini-3.7-flash (Recomendado/Padrão)
              </option>
              <option value="gemini-3.6-flash">gemini-3.6-flash</option>
              <option value="gemini-3.5-flash">gemini-3.5-flash</option>
              <option value="gemini-3.1-pro">gemini-3.1-pro</option>
              <option value="gemini-3.1-flash-lite">
                gemini-3.1-flash-lite
              </option>
            </optgroup>
            <optgroup label="Stable (2.5)">
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
            </optgroup>
            <optgroup label="Custom">
              <option value="custom">Custom model...</option>
            </optgroup>
          </select>

          <!-- Custom Model ID Input -->
          <div
            v-if="selectedModel === 'custom'"
            class="mt-2 flex flex-col gap-1">
            <label
              class="text-c-2 text-xs font-medium"
              for="gemini-custom-model">
              Custom Model ID
            </label>
            <input
              id="gemini-custom-model"
              v-model="customModel"
              class="border-border bg-b-1 text-c-1 focus:border-c-1 w-full rounded border px-3 py-2 outline-none"
              data-testid="gemini-custom-model-input"
              placeholder="e.g. gemini-1.5-pro-latest"
              type="text" />
          </div>
        </div>

        <!-- Advanced Settings (Collapsible) -->
        <div class="border-border flex flex-col gap-2 border-t pt-3">
          <button
            class="text-c-2 hover:text-c-1 flex items-center gap-1.5 text-xs font-medium"
            data-testid="toggle-advanced-settings"
            type="button"
            @click="showAdvanced = !showAdvanced">
            <ScalarIconCaretDown
              v-if="showAdvanced"
              class="size-3.5" />
            <ScalarIconCaretRight
              v-else
              class="size-3.5" />
            <span>Advanced Settings</span>
          </button>

          <div
            v-if="showAdvanced"
            class="flex flex-col gap-1.5 pl-4">
            <label
              class="text-c-2 text-xs font-medium"
              for="gemini-base-url">
              Base URL / Proxy
            </label>
            <input
              id="gemini-base-url"
              v-model="baseUrl"
              class="border-border bg-b-1 text-c-1 focus:border-c-1 w-full rounded border px-3 py-2 outline-none"
              data-testid="gemini-base-url-input"
              placeholder="https://generativelanguage.googleapis.com/v1beta"
              type="text" />
          </div>
        </div>
      </template>

      <!-- Scalar Cloud Provider Info -->
      <template v-else>
        <div class="border-border bg-b-2 text-c-2 rounded border p-3">
          Using Scalar Cloud managed API agent.
        </div>
      </template>

      <!-- Action Buttons -->
      <div class="border-border flex justify-end gap-2 border-t pt-4">
        <ScalarButton
          data-testid="cancel-settings-button"
          type="button"
          variant="outlined"
          @click="handleCancel">
          Cancelar
        </ScalarButton>
        <ScalarButton
          data-testid="save-settings-button"
          type="button"
          @click="handleSave">
          Salvar
        </ScalarButton>
      </div>
    </div>
  </ScalarModal>
</template>

<style scoped>
.agentSettingsModal {
  max-width: 520px;
}
.settingsHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px 16px;
  border-bottom: 1px solid var(--scalar-border-color, #e5e7eb);
}
</style>
