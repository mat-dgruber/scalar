<script setup lang="ts">
import { ScalarIconArrowUp, ScalarIconSparkle } from '@scalar/icons'
import type { OperationObject } from '@scalar/workspace-store/schemas/v3.1/strict/openapi-document'
import { ref } from 'vue'

import { useLocalization } from '@/features/localization'
import { useAgentContext } from '@/hooks/use-agent'

const props = defineProps<{
  method?: string
  path?: string
  operation?: OperationObject
}>()

const agentContext = useAgentContext()
const { translate } = useLocalization()

const message = ref('')
const inputRef = ref<HTMLInputElement>()

function formatEndpointPrompt(userText?: string): string {
  const trimmed = userText?.trim() || ''
  if (!props.method && !props.path) {
    return trimmed
  }

  const methodUpper = props.method ? props.method.toUpperCase() : 'GET'
  const pathStr = props.path || ''
  const summary = props.operation?.summary
    ? ` (${props.operation.summary})`
    : ''
  const contextPrefix = `[Endpoint: ${methodUpper} ${pathStr}${summary}]`

  if (trimmed) {
    return `${contextPrefix} ${trimmed}`
  }
  return `${contextPrefix} Por favor, explique como funciona este endpoint, seus parâmetros, payloads esperados e como utilizá-lo.`
}

function handleSubmit() {
  const formatted = formatEndpointPrompt(message.value)
  agentContext.value?.openAgent(formatted)
  message.value = ''
}

function handleContainerClick(event: MouseEvent) {
  // If clicked directly on the sparkle icon or label, open the agent with endpoint context
  const target = event.target as HTMLElement
  if (target !== inputRef.value && !inputRef.value?.contains(target)) {
    if (message.value.trim().length === 0) {
      const formatted = formatEndpointPrompt('')
      agentContext.value?.openAgent(formatted)
      return
    }
  }
  inputRef.value?.focus()
}
</script>
<template>
  <form
    v-if="agentContext?.agentEnabled.value"
    class="agent-button-container"
    @click="handleContainerClick"
    @submit.prevent="handleSubmit()">
    <ScalarIconSparkle
      class="size-3.5 shrink-0"
      weight="fill" />
    <div class="ask-agent-scalar-input-label">
      {{ translate('agent.askAiAgent') }}
    </div>
    <input
      ref="inputRef"
      v-model="message"
      class="ask-agent-scalar-input"
      :class="{ 'ask-agent-scalar-input-not-empty': message.length > 0 }"
      :placeholder="translate('agent.askAiAgent')" />
    <button
      class="ask-agent-scalar-send"
      type="submit"
      title="Enviar pergunta para o AI Agent">
      <ScalarIconArrowUp
        class="size-3.5"
        weight="bold" />
    </button>
  </form>
</template>
<style scoped>
/** Container */
.agent-button-container {
  position: relative;
  color: var(--scalar-color-1);
  background: color-mix(in srgb, var(--scalar-background-3), white 15%);
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 2px 8px;
  margin-right: 6px;
  border-radius: var(--scalar-radius);
  z-index: 2;
  height: 24px;
  min-width: 145px;
  transition:
    min-width 0.2s ease,
    background 0.15s ease,
    outline 0.15s ease;
}
.agent-button-container:hover:not(:focus-within) {
  background: color-mix(in srgb, var(--scalar-background-3), white 20%);
}
.agent-button-container:has(.ask-agent-scalar-input-not-empty),
.agent-button-container:focus-within {
  cursor: text;
  background: var(--scalar-background-1);
  outline: 1px solid var(--scalar-color-accent);
  min-width: 280px;
}
.dark-mode .agent-button-container {
  background: color-mix(in srgb, var(--scalar-background-3), black 15%);
}
.dark-mode .agent-button-container:hover:not(:focus-within) {
  background: color-mix(in srgb, var(--scalar-background-3), black 20%);
}
.dark-mode .agent-button-container:has(.ask-agent-scalar-input-not-empty),
.dark-mode .agent-button-container:focus-within {
  background: var(--scalar-background-1);
}

/** Input */
.ask-agent-scalar-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  padding-left: 24px;
  padding-right: 26px;
  font-size: var(--scalar-mini);
  color: var(--scalar-color-1);
  outline: none;
  background: transparent;
  border: none;
  font-family: var(--scalar-font);
}
.ask-agent-scalar-input-not-empty,
.ask-agent-scalar-input:focus {
  opacity: 1;
  cursor: text;
}

/** Label */
.ask-agent-scalar-input-label {
  font-weight: var(--scalar-semibold);
  font-size: var(--scalar-mini);
  white-space: nowrap;
  user-select: none;
  padding-left: 4px;
  color: var(--scalar-color-2);
}
.ask-agent-scalar-input-not-empty + .ask-agent-scalar-input-label,
.agent-button-container:focus-within .ask-agent-scalar-input-label {
  opacity: 0;
}

/** Send Button */
.ask-agent-scalar-send {
  position: absolute;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  width: 18px;
  border-radius: var(--scalar-radius);
  background: var(--scalar-background-3);
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  border: none;
  padding: 0;
  color: var(--scalar-color-1);
  transition:
    opacity 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}
.ask-agent-scalar-send:hover {
  background: var(--scalar-color-accent);
  color: #ffffff;
}
.ask-agent-scalar-input-not-empty ~ .ask-agent-scalar-send,
.agent-button-container:focus-within .ask-agent-scalar-send {
  opacity: 1;
  pointer-events: auto;
}
</style>
