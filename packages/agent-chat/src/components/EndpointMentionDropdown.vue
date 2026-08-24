<script setup lang="ts">
export interface EndpointOption {
  method: string
  path: string
  summary: string
  tag?: string
}

const { endpoints, selectedIndex = 0 } = defineProps<{
  endpoints: EndpointOption[]
  selectedIndex?: number
}>()

const emit = defineEmits<{
  (e: 'select', endpoint: EndpointOption): void
}>()

function getMethodClass(method: string) {
  const m = method.toUpperCase()
  switch (m) {
    case 'GET':
      return 'method-get'
    case 'POST':
      return 'method-post'
    case 'PUT':
    case 'PATCH':
      return 'method-put'
    case 'DELETE':
      return 'method-delete'
    default:
      return 'method-default'
  }
}
</script>

<template>
  <div class="mention-dropdown custom-scroll">
    <div class="mention-header">
      <span>Endpoints da API</span>
      <span class="mention-hint">↑↓ navegar • Enter selecionar</span>
    </div>
    <ul
      v-if="endpoints.length"
      class="mention-list">
      <li
        v-for="(item, index) in endpoints"
        :key="`${item.method}-${item.path}`"
        class="mention-item"
        :class="{ 'is-selected': index === selectedIndex }"
        @click="emit('select', item)">
        <span
          class="method-badge"
          :class="getMethodClass(item.method)">
          {{ item.method }}
        </span>
        <span class="mention-path">{{ item.path }}</span>
        <span
          v-if="item.summary"
          class="mention-summary">
          {{ item.summary }}
        </span>
      </li>
    </ul>
    <div
      v-else
      class="mention-empty">
      Nenhum endpoint correspondente
    </div>
  </div>
</template>

<style scoped>
.mention-dropdown {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 8px;
  right: 8px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--scalar-background-1);
  border: var(--scalar-border-width) solid var(--scalar-border-color);
  border-radius: var(--scalar-radius-lg);
  box-shadow: var(--scalar-shadow-2);
  z-index: 100;
  padding: 4px;
}
.dark-mode .mention-dropdown {
  background: var(--scalar-background-2);
}

.mention-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  font-size: var(--scalar-font-size-4);
  font-weight: var(--scalar-semibold);
  color: var(--scalar-color-2);
  border-bottom: var(--scalar-border-width) solid var(--scalar-border-color);
  margin-bottom: 4px;
}

.mention-hint {
  font-size: var(--scalar-micro);
  color: var(--scalar-color-3);
  font-weight: normal;
}

.mention-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--scalar-radius);
  cursor: pointer;
  font-size: var(--scalar-font-size-3);
  transition: background 0.15s ease;
}

.mention-item:hover,
.mention-item.is-selected {
  background: var(--scalar-background-2);
}

.dark-mode .mention-item:hover,
.dark-mode .mention-item.is-selected {
  background: var(--scalar-background-3);
}

.method-badge {
  font-family: var(--scalar-font-code);
  font-size: var(--scalar-micro);
  font-weight: var(--scalar-bold);
  padding: 2px 6px;
  border-radius: var(--scalar-radius);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.method-get {
  background: rgba(37, 99, 235, 0.15);
  color: #2563eb;
}
.method-post {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.method-put {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.method-delete {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.method-default {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

.mention-path {
  font-family: var(--scalar-font-code);
  font-weight: var(--scalar-semibold);
  color: var(--scalar-color-1);
}

.mention-summary {
  color: var(--scalar-color-3);
  font-size: var(--scalar-font-size-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: auto;
  max-width: 40%;
}

.mention-empty {
  padding: 12px;
  text-align: center;
  color: var(--scalar-color-3);
  font-size: var(--scalar-font-size-3);
}
</style>
