# Internal Share and Integrate Developer Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the developer tools bar in `@scalar/api-reference` into a 100% internal and client-side solution by replacing external cloud share/deploy with local export/hash URL preview and framework integration snippets with internal guide access.

**Architecture:** 
- Leverage existing `downloadDocument` helper and native browser `CompressionStream`/`DecompressionStream` (gzip + base64url) for zero-backend spec compression and sharing.
- Replace `DeployApiReference` with `IntegrateApiReference`, presenting code snippets for Express, Fastify, NestJS, Hono, FastAPI, and HTML standalone alongside direct access to internal DX and architecture guides.
- Update `DeveloperTools.vue` and localization catalogs (`en.ts`, `pt.ts`) to reflect the new capabilities and remove external network endpoints (`api.scalar.com`, `registry.scalar.com`, `dashboard.scalar.com`).

**Tech Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), TypeScript, Vitest, `@scalar/components`, `@scalar/icons`, `@scalar/workspace-store`, `yaml`.

## Global Constraints

- Zero external network requests from Developer Tools (no calls to `api.scalar.com`, `registry.scalar.com`, `dashboard.scalar.com`).
- Use existing helpers (`downloadDocument`) and native platform APIs (`CompressionStream`, `Blob`, `URL.createObjectURL`).
- Scoped package testing: `corepack pnpm vitest packages/api-reference --run`.
- Type checking: `corepack pnpm --filter @scalar/api-reference types:check`.

---

### Task 1: Spec Compression and Hash URL Helpers

**Files:**
- Create: `packages/api-reference/src/helpers/spec-compression.ts`
- Test: `packages/api-reference/src/helpers/spec-compression.test.ts`

**Interfaces:**
- Consumes: None (Native Web APIs: `CompressionStream`, `DecompressionStream`, `Blob`, `btoa`, `atob`)
- Produces:
  - `compressSpec(jsonString: string): Promise<string>`
  - `decompressSpec(base64Url: string): Promise<string>`
  - `generateSpecHashUrl(jsonString: string, originAndPath?: string): Promise<string>`
  - `getSpecFromUrlHash(hashOrSearch?: string): Promise<string | null>`

- [ ] **Step 1: Write the failing unit tests for spec compression**

Create `packages/api-reference/src/helpers/spec-compression.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import {
  compressSpec,
  decompressSpec,
  generateSpecHashUrl,
  getSpecFromUrlHash,
} from './spec-compression'

describe('spec-compression', () => {
  const sampleSpec = JSON.stringify({
    openapi: '3.1.0',
    info: { title: 'Internal API', version: '1.0.0' },
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  })

  it('compresses and decompresses OpenAPI JSON correctly', async () => {
    const compressed = await compressSpec(sampleSpec)
    expect(typeof compressed).toBe('string')
    expect(compressed.length).toBeLessThan(sampleSpec.length)

    const decompressed = await decompressSpec(compressed)
    expect(decompressed).toBe(sampleSpec)
    expect(JSON.parse(decompressed)).toEqual(JSON.parse(sampleSpec))
  })

  it('generates a valid hash URL with #spec=', async () => {
    const url = await generateSpecHashUrl(sampleSpec, 'http://localhost:5054/docs')
    expect(url).toContain('http://localhost:5054/docs#spec=')

    const hash = url.split('#spec=')[1]
    const extracted = await getSpecFromUrlHash(`#spec=${hash}`)
    expect(extracted).toBe(sampleSpec)
  })

  it('returns null when hash does not contain spec', async () => {
    const result = await getSpecFromUrlHash('#other-tag')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm vitest packages/api-reference/src/helpers/spec-compression.test.ts --run`
Expected: FAIL with module not found / functions not defined.

- [ ] **Step 3: Implement `spec-compression.ts`**

Create `packages/api-reference/src/helpers/spec-compression.ts`:
```typescript
/**
 * Compresses an OpenAPI JSON string using Gzip and encodes to URL-safe Base64.
 */
export async function compressSpec(jsonString: string): Promise<string> {
  const stream = new Blob([jsonString]).stream().pipeThrough(new CompressionStream('gzip'))
  const response = new Response(stream)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decodes a URL-safe Base64 string and decompresses via Gzip.
 */
export async function decompressSpec(base64Url: string): Promise<string> {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  const response = new Response(stream)
  return await response.text()
}

/**
 * Generates a full URL containing the compressed spec in the hash fragment.
 */
export async function generateSpecHashUrl(
  jsonString: string,
  originAndPath?: string,
): Promise<string> {
  const compressed = await compressSpec(jsonString)
  const base =
    originAndPath ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '')
  return `${base}#spec=${compressed}`
}

/**
 * Extracts and decompresses the OpenAPI spec from a URL hash or query string.
 */
export async function getSpecFromUrlHash(
  hashOrSearch?: string,
): Promise<string | null> {
  const raw =
    hashOrSearch ?? (typeof window !== 'undefined' ? window.location.hash : '')
  if (!raw) {
    return null
  }

  const match = raw.match(/[#&?]spec=([^&]+)/)
  if (!match || !match[1]) {
    return null
  }

  try {
    return await decompressSpec(decodeURIComponent(match[1]))
  } catch (err) {
    console.error('Failed to decompress spec from URL hash:', err)
    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm vitest packages/api-reference/src/helpers/spec-compression.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api-reference/src/helpers/spec-compression.ts packages/api-reference/src/helpers/spec-compression.test.ts
git commit -m "feat(api-reference): add client-side spec compression and hash url helpers"
```

---

### Task 2: Local Share Toolbar Component (Download & Offline Link)

**Files:**
- Create: `packages/api-reference/src/features/developer-tools/components/ApiReferenceToolbarShareLocal.vue`
- Modify: `packages/api-reference/src/features/developer-tools/components/ShareApiReference.vue`

**Interfaces:**
- Consumes:
  - `workspace.exportActiveDocument('json')`
  - `downloadDocument` from `@/helpers/download`
  - `generateSpecHashUrl` from `@/helpers/spec-compression`
  - `useToasts` from `@scalar/use-toasts`
  - `useClipboard` from `@scalar/use-hooks/useClipboard`
- Produces:
  - `ShareApiReference.vue` rendering the local export and preview actions.

- [ ] **Step 1: Create `ApiReferenceToolbarShareLocal.vue`**

Create `packages/api-reference/src/features/developer-tools/components/ApiReferenceToolbarShareLocal.vue`:
```vue
<script lang="ts" setup>
import { ScalarButton } from '@scalar/components/button'
import { ScalarTextInputCopy } from '@scalar/components/text-input'
import {
  ScalarIconArrowDown,
  ScalarIconClipboard,
  ScalarIconFileCode,
  ScalarIconLink,
} from '@scalar/icons'
import { useClipboard } from '@scalar/use-hooks/useClipboard'
import { useToasts } from '@scalar/use-toasts'
import type { WorkspaceStore } from '@scalar/workspace-store/client'
import { ref } from 'vue'

import { useLocalization } from '@/features/localization'
import { downloadDocument } from '@/helpers/download'
import { generateSpecHashUrl } from '@/helpers/spec-compression'

const props = defineProps<{
  workspace?: WorkspaceStore
}>()

const { toast } = useToasts()
const { copyToClipboard } = useClipboard()
const { translate } = useLocalization()

const previewUrl = ref<string>('')
const isGeneratingUrl = ref(false)

async function handleDownload(format: 'json' | 'yaml') {
  const document = props.workspace?.exportActiveDocument('json')
  if (!document) {
    toast(translate('developerTools.unableToExportDocument'), 'error')
    return
  }
  try {
    await downloadDocument(document, 'openapi', format)
    toast(
      `${translate('developerTools.downloaded')} openapi.${format}`,
      'info',
    )
  } catch (error) {
    toast(translate('developerTools.unknownError'), 'error')
  }
}

async function handleCopySpec() {
  const document = props.workspace?.exportActiveDocument('json')
  if (!document) {
    toast(translate('developerTools.unableToExportDocument'), 'error')
    return
  }
  copyToClipboard(document)
  toast(translate('developerTools.specCopied'), 'info')
}

async function handleGeneratePreviewUrl() {
  const document = props.workspace?.exportActiveDocument('json')
  if (!document) {
    toast(translate('developerTools.unableToExportDocument'), 'error')
    return
  }
  isGeneratingUrl.value = true
  try {
    previewUrl.value = await generateSpecHashUrl(document)
    toast(translate('developerTools.linkGenerated'), 'info')
  } catch (error) {
    toast(translate('developerTools.unknownError'), 'error')
  } finally {
    isGeneratingUrl.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Download / Copy Buttons Section -->
    <div class="flex flex-col gap-2">
      <span class="text-c-2 text-xs font-semibold uppercase tracking-wide">
        {{ translate('developerTools.localExport') }}
      </span>
      <div class="grid grid-cols-3 gap-2">
        <ScalarButton
          class="flex items-center justify-center gap-1.5"
          size="sm"
          variant="outlined"
          @click="handleDownload('json')">
          <ScalarIconFileCode class="size-4" />
          <span>JSON</span>
        </ScalarButton>
        <ScalarButton
          class="flex items-center justify-center gap-1.5"
          size="sm"
          variant="outlined"
          @click="handleDownload('yaml')">
          <ScalarIconArrowDown class="size-4" />
          <span>YAML</span>
        </ScalarButton>
        <ScalarButton
          class="flex items-center justify-center gap-1.5"
          size="sm"
          variant="outlined"
          @click="handleCopySpec">
          <ScalarIconClipboard class="size-4" />
          <span>{{ translate('developerTools.copy') }}</span>
        </ScalarButton>
      </div>
    </div>

    <!-- Client-Side Share Link Section -->
    <div class="flex flex-col gap-2">
      <span class="text-c-2 text-xs font-semibold uppercase tracking-wide">
        {{ translate('developerTools.previewLink') }}
      </span>
      <template v-if="previewUrl">
        <ScalarTextInputCopy
          immediate
          :modelValue="previewUrl"
          name="preview-link" />
      </template>
      <template v-else>
        <ScalarButton
          class="flex w-full items-center justify-center gap-2"
          :disabled="isGeneratingUrl"
          size="sm"
          variant="solid"
          @click="handleGeneratePreviewUrl">
          <ScalarIconLink class="size-4" />
          <span>{{ translate('developerTools.generatePreviewLink') }}</span>
        </ScalarButton>
      </template>
      <p class="text-c-3 text-xs">
        {{ translate('developerTools.previewLinkHint') }}
      </p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Update `ShareApiReference.vue` to use local share**

Update `packages/api-reference/src/features/developer-tools/components/ShareApiReference.vue`:
```vue
<script lang="ts" setup>
import { ScalarFormSection } from '@scalar/components/form'
import type { WorkspaceStore } from '@scalar/workspace-store/client'

import { useLocalization } from '@/features/localization'

import ApiReferenceToolbarPopover from './ApiReferenceToolbarPopover.vue'
import ApiReferenceToolbarShareLocal from './ApiReferenceToolbarShareLocal.vue'

const { workspace } = defineProps<{
  workspace?: WorkspaceStore
}>()
const { translate } = useLocalization()
</script>
<template>
  <ApiReferenceToolbarPopover class="w-96">
    <template #label>{{ translate('developerTools.share') }}</template>
    <ScalarFormSection>
      <template #label>{{ translate('developerTools.shareTitle') }}</template>
      <p class="text-c-2 mb-3 text-sm leading-normal">
        {{ translate('developerTools.shareDescription') }}
      </p>
      <ApiReferenceToolbarShareLocal :workspace="workspace" />
    </ScalarFormSection>
  </ApiReferenceToolbarPopover>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add packages/api-reference/src/features/developer-tools/components/ApiReferenceToolbarShareLocal.vue packages/api-reference/src/features/developer-tools/components/ShareApiReference.vue
git commit -m "feat(api-reference): implement local export and client-side share popover"
```

---

### Task 3: Framework Integration Snippets and Internal Guides Component

**Files:**
- Create: `packages/api-reference/src/features/developer-tools/components/ApiReferenceToolbarIntegrate.vue`
- Create: `packages/api-reference/src/features/developer-tools/components/IntegrateApiReference.vue`

**Interfaces:**
- Consumes:
  - `ScalarCodeBlock` from `@scalar/components/code-block`
  - `useLocalization` from `@/features/localization`
- Produces:
  - `IntegrateApiReference.vue` component replacing `DeployApiReference.vue`.

- [ ] **Step 1: Create `ApiReferenceToolbarIntegrate.vue`**

Create `packages/api-reference/src/features/developer-tools/components/ApiReferenceToolbarIntegrate.vue`:
```vue
<script lang="ts" setup>
import { ScalarCodeBlock } from '@scalar/components/code-block'
import { ScalarButton } from '@scalar/components/button'
import {
  ScalarIconBookOpen,
  ScalarIconCode,
  ScalarIconExternalLink,
} from '@scalar/icons'
import { computed, ref } from 'vue'

import { useLocalization } from '@/features/localization'

type FrameworkKey = 'express' | 'fastify' | 'nestjs' | 'hono' | 'fastapi' | 'html'

const { translate } = useLocalization()
const activeTab = ref<'snippets' | 'guides'>('snippets')
const selectedFramework = ref<FrameworkKey>('express')

const FRAMEWORKS: Array<{ id: FrameworkKey; name: string; lang: string }> = [
  { id: 'express', name: 'Express', lang: 'typescript' },
  { id: 'fastify', name: 'Fastify', lang: 'typescript' },
  { id: 'nestjs', name: 'NestJS', lang: 'typescript' },
  { id: 'hono', name: 'Hono', lang: 'typescript' },
  { id: 'fastapi', name: 'FastAPI (Python)', lang: 'python' },
  { id: 'html', name: 'HTML / CDN', lang: 'html' },
]

const SNIPPETS: Record<FrameworkKey, string> = {
  express: `import { apiReference } from '@scalar/express-api-reference'
import express from 'express'

const app = express()

app.use(
  '/reference',
  apiReference({
    spec: { url: '/openapi.json' },
    theme: 'default',
  }),
)`,
  fastify: `import { fastifyApiReference } from '@scalar/fastify-api-reference'
import Fastify from 'fastify'

const fastify = Fastify()

await fastify.register(fastifyApiReference, {
  routePrefix: '/reference',
  configuration: {
    spec: { url: '/openapi.json' },
  },
})`,
  nestjs: `import { apiReference } from '@scalar/nestjs-api-reference'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use('/reference', apiReference({ spec: { url: '/openapi.json' } }))
  await app.listen(3000)
}
bootstrap()`,
  hono: `import { apiReference } from '@scalar/hono-api-reference'
import { Hono } from 'hono'

const app = new Hono()

app.get(
  '/reference',
  apiReference({
    spec: { url: '/openapi.json' },
  }),
)`,
  fastapi: `from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()

@app.get("/reference", response_class=HTMLResponse)
async def scalar_html():
    return """
    <!doctype html>
    <html>
      <head>
        <title>Scalar API Reference</title>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </head>
      <body>
        <script id="api-reference" data-url="/openapi.json"></script>
      </body>
    </html>
    """`,
  html: `<!doctype html>
<html>
  <head>
    <title>API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/openapi.json"
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`,
}

const currentSnippet = computed(() => SNIPPETS[selectedFramework.value])
const currentLang = computed(
  () =>
    FRAMEWORKS.find((f) => f.id === selectedFramework.value)?.lang ??
    'typescript',
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header Tabs: Snippets vs Guides -->
    <div class="flex border-b">
      <button
        class="flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="
          activeTab === 'snippets'
            ? 'border-c-1 text-c-1'
            : 'border-transparent text-c-3 hover:text-c-1'
        "
        type="button"
        @click="activeTab = 'snippets'">
        <ScalarIconCode class="size-3.5" />
        <span>{{ translate('developerTools.frameworkSnippets') }}</span>
      </button>
      <button
        class="flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="
          activeTab === 'guides'
            ? 'border-c-1 text-c-1'
            : 'border-transparent text-c-3 hover:text-c-1'
        "
        type="button"
        @click="activeTab = 'guides'">
        <ScalarIconBookOpen class="size-3.5" />
        <span>{{ translate('developerTools.internalGuides') }}</span>
      </button>
    </div>

    <!-- Tab 1: Framework Snippets -->
    <div v-if="activeTab === 'snippets'" class="flex flex-col gap-3">
      <!-- Framework Selector Pills -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="fw in FRAMEWORKS"
          :key="fw.id"
          class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
          :class="
            selectedFramework === fw.id
              ? 'bg-b-2 text-c-1 font-semibold shadow-xs'
              : 'text-c-2 hover:bg-b-2'
          "
          type="button"
          @click="selectedFramework = fw.id">
          {{ fw.name }}
        </button>
      </div>

      <!-- Code Block -->
      <div class="overflow-hidden rounded-md border text-xs">
        <ScalarCodeBlock
          copy
          :content="currentSnippet"
          :language="currentLang" />
      </div>
    </div>

    <!-- Tab 2: Internal Guides -->
    <div v-else class="flex flex-col gap-3 text-sm">
      <div class="flex flex-col gap-1 rounded-md border p-3">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-c-1">Guia Padrão OpenAPI & DX</span>
          <span class="text-xs text-c-3">docs/guides/</span>
        </div>
        <p class="text-xs text-c-2">
          Padrões de design de endpoints, contratos REST, tags semânticas e exemplos executáveis.
        </p>
      </div>

      <div class="flex flex-col gap-1 rounded-md border p-3">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-c-1">Guia de Arquitetura do Fork</span>
          <span class="text-xs text-c-3">docs/guides/</span>
        </div>
        <p class="text-xs text-c-2">
          Visão geral da estrutura de pacotes, convenções de commits, Sandboxing Zero-Trust e MCP.
        </p>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create `IntegrateApiReference.vue`**

Create `packages/api-reference/src/features/developer-tools/components/IntegrateApiReference.vue`:
```vue
<script lang="ts" setup>
import { ScalarFormSection } from '@scalar/components/form'
import { useLocalization } from '@/features/localization'

import ApiReferenceToolbarPopover from './ApiReferenceToolbarPopover.vue'
import ApiReferenceToolbarIntegrate from './ApiReferenceToolbarIntegrate.vue'

const { translate } = useLocalization()
</script>

<template>
  <ApiReferenceToolbarPopover class="w-128">
    <template #label>{{ translate('developerTools.integrate') }}</template>
    <ScalarFormSection>
      <template #label>{{ translate('developerTools.integrateTitle') }}</template>
      <p class="text-c-2 mb-3 text-sm leading-normal">
        {{ translate('developerTools.integrateDescription') }}
      </p>
      <ApiReferenceToolbarIntegrate />
    </ScalarFormSection>
  </ApiReferenceToolbarPopover>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add packages/api-reference/src/features/developer-tools/components/ApiReferenceToolbarIntegrate.vue packages/api-reference/src/features/developer-tools/components/IntegrateApiReference.vue
git commit -m "feat(api-reference): add framework integration snippets and internal guides popover"
```

---

### Task 4: Toolbar Integration, i18n & URL Hash Bootstrap

**Files:**
- Modify: `packages/api-reference/src/features/developer-tools/DeveloperTools.vue`
- Modify: `packages/api-reference/src/features/localization/locales/en.ts`
- Modify: `packages/api-reference/src/features/localization/locales/pt.ts`
- Modify: `packages/api-reference/src/components/ApiReference.vue`

**Interfaces:**
- Consumes:
  - `IntegrateApiReference.vue`
  - `ShareApiReference.vue`
  - `getSpecFromUrlHash` from `@/helpers/spec-compression`
- Produces:
  - Updated toolbar without external endpoints.
  - Automatic spec loading when `#spec=` is present in the URL.

- [ ] **Step 1: Update `en.ts` and `pt.ts` localization keys**

Add the new translation keys to `packages/api-reference/src/features/localization/locales/en.ts` and `pt.ts`:
- `downloaded`: "Downloaded" / "Baixado"
- `copy`: "Copy" / "Copiar"
- `specCopied`: "OpenAPI specification copied to clipboard" / "Especificação OpenAPI copiada para a área de transferência"
- `linkGenerated`: "Preview link generated" / "Link de prévia gerado"
- `localExport`: "Local Export" / "Exportação Local"
- `generatePreviewLink`: "Generate Preview Link" / "Gerar Link de Prévia"
- `previewLinkHint`: "Client-side preview compressed into URL hash. No server upload required." / "Prévia client-side compactada no hash da URL. Nenhum upload em servidor necessário."
- `integrate`: "Integrate" / "Integrar"
- `integrateTitle`: "Integrate Scalar in your Project" / "Integrar o Scalar no seu Projeto"
- `integrateDescription`: "Copy code snippets for your preferred framework or explore internal guidelines." / "Copie snippets de código para o seu framework preferido ou consulte os guias internos."
- `frameworkSnippets`: "Framework Snippets" / "Snippets de Frameworks"
- `internalGuides`: "Internal Guides" / "Guias Internos"

- [ ] **Step 2: Update `DeveloperTools.vue`**

Update `packages/api-reference/src/features/developer-tools/DeveloperTools.vue` to import and render `IntegrateApiReference` instead of `DeployApiReference`, and remove unused externalUrls prop requirements where appropriate.

- [ ] **Step 3: Update `ApiReference.vue` to check URL hash on mount**

In `packages/api-reference/src/components/ApiReference.vue`, add an `onMounted` check for `getSpecFromUrlHash(window.location.hash)` and load it into the workspace if present:
```typescript
onMounted(async () => {
  if (typeof window !== 'undefined' && window.location.hash.includes('spec=')) {
    const specFromHash = await getSpecFromUrlHash(window.location.hash)
    if (specFromHash && workspace) {
      workspace.importDocument(specFromHash)
    }
  }
})
```

- [ ] **Step 4: Run type checks and tests**

Run:
```bash
corepack pnpm --filter @scalar/api-reference types:check
corepack pnpm vitest packages/api-reference/src/helpers/spec-compression.test.ts --run
```
Expected: PASS with 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/api-reference/src/features/developer-tools/DeveloperTools.vue packages/api-reference/src/features/localization/locales/en.ts packages/api-reference/src/features/localization/locales/pt.ts packages/api-reference/src/components/ApiReference.vue
git commit -m "feat(api-reference): wire integrate component and hash spec loader into developer tools"
```

---

### Task 5: End-to-End Verification and Validation

**Files:**
- Test: All tests in `packages/api-reference/src/helpers/`
- Build: `packages/api-reference`

- [ ] **Step 1: Run full scoped tests for `@scalar/api-reference`**

Run: `corepack pnpm vitest packages/api-reference --run`
Expected: PASS

- [ ] **Step 2: Run build for `@scalar/api-reference`**

Run: `corepack pnpm --filter @scalar/api-reference build`
Expected: Successful build without errors.

- [ ] **Step 3: Final Commit & Changeset Check**

Check status and commit any cleanups:
```bash
git status
```
