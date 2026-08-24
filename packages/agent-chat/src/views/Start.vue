<script setup lang="ts">
import { computed } from 'vue'

import Logo from '@/components/Logo.vue'
import { URLS } from '@/consts/urls'
import { loadStoredGeminiConfig } from '@/state/gemini-settings'
import { useState } from '@/state/state'
import PromptForm from '@/views/PromptForm.vue'

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'uploadApi'): void
}>()

const { mode, agentSettingsModal } = useState()

const storedConfig = computed(() => loadStoredGeminiConfig())
const hasGeminiKey = computed(() => Boolean(storedConfig.value?.apiKey))
</script>

<template>
  <div class="startContainer">
    <Logo class="agentLogo" />
    <p class="promptText">How can I help you today?</p>

    <!-- Gemini BYOK Quick Access & Status -->
    <div
      v-if="agentSettingsModal"
      class="geminiStatusBanner">
      <button
        type="button"
        class="geminiQuickBtn"
        :class="{ active: hasGeminiKey }"
        @click="agentSettingsModal.show()">
        <span class="sparkle">✨</span>
        <span
          v-if="hasGeminiKey"
          class="bannerText">
          Gemini Conectado •
          <strong class="modelName">{{
            storedConfig?.model || 'gemini-3.7-flash'
          }}</strong>
        </span>
        <span
          v-else
          class="bannerText">
          Configurar Chave Gemini (BYOK) para habilitar IA
        </span>
        <span class="actionTag">{{
          hasGeminiKey ? 'Alterar ⚙' : 'Configurar →'
        }}</span>
      </button>
    </div>

    <PromptForm
      ref="promptFormField"
      @submit="emit('submit')"
      @uploadApi="emit('uploadApi')" />
    <p class="disclaimerText">
      <template v-if="mode === 'preview'">
        By messaging Agent Scalar your OpenAPI document will be temporarily
        uploaded to Scalar's servers. You must agree to our
      </template>
      <template v-else>By messaging Agent Scalar you agree to our </template>
      <a
        class="disclaimerLink"
        :href="URLS.TERMS_AND_CONDITIONS"
        target="_blank"
        >Terms</a
      >
      and
      <a
        class="disclaimerLink"
        :href="URLS.PRIVACY_POLICY"
        target="_blank"
        >Privacy Policy</a
      >.
    </p>
  </div>
</template>

<style scoped>
.agentLogo {
  margin-bottom: 15px;
}

.startContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  max-width: 720px;
  position: relative;
}

.promptText {
  font-size: 1.5rem;
  font-weight: var(--scalar-font-bold);
  margin-bottom: 24px;
}

.geminiStatusBanner {
  margin-bottom: 20px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.geminiQuickBtn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: var(--scalar-radius-full);
  background: var(--scalar-background-2);
  border: var(--scalar-border-width) solid var(--scalar-border-color);
  color: var(--scalar-color-2);
  font-size: var(--scalar-font-size-3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.geminiQuickBtn:hover {
  background: var(--scalar-background-3);
  border-color: var(--scalar-color-accent);
  color: var(--scalar-color-1);
}

.geminiQuickBtn.active {
  border-color: color-mix(
    in srgb,
    var(--scalar-color-accent) 40%,
    var(--scalar-border-color)
  );
}

.sparkle {
  font-size: 13px;
}

.bannerText {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.modelName {
  color: var(--scalar-color-accent);
  font-weight: var(--scalar-font-bold);
}

.actionTag {
  color: var(--scalar-color-accent);
  font-size: var(--scalar-font-size-2);
  font-weight: var(--scalar-font-medium);
  margin-left: 4px;
}

.disclaimerText {
  text-align: center;
  color: var(--scalar-color-3);
  font-size: var(--scalar-font-size-3);
  text-wrap: balance;
  line-height: 1.44;
  margin-top: 40px;
}

.disclaimerLink {
  text-decoration: underline;
}
</style>
