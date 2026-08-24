<script lang="ts" setup>
import { ScalarCodeBlock } from '@scalar/components/code-block'
import { ScalarIconBookOpen, ScalarIconCode } from '@scalar/icons'
import { computed, ref } from 'vue'

import { useLocalization } from '@/features/localization'

type FrameworkKey =
  | 'express'
  | 'fastify'
  | 'nestjs'
  | 'hono'
  | 'fastapi'
  | 'html'

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
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"><\\/script>
      </head>
      <body>
        <script id="api-reference" data-url="/openapi.json"><\\/script>
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
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"><\\/script>
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
            : 'text-c-3 hover:text-c-1 border-transparent'
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
            : 'text-c-3 hover:text-c-1 border-transparent'
        "
        type="button"
        @click="activeTab = 'guides'">
        <ScalarIconBookOpen class="size-3.5" />
        <span>{{ translate('developerTools.internalGuides') }}</span>
      </button>
    </div>

    <!-- Tab 1: Framework Snippets -->
    <div
      v-if="activeTab === 'snippets'"
      class="flex flex-col gap-3">
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
          copy="always"
          :content="currentSnippet"
          :lang="currentLang" />
      </div>
    </div>

    <!-- Tab 2: Internal Guides -->
    <div
      v-else
      class="flex flex-col gap-3 text-sm">
      <div class="flex flex-col gap-1 rounded-md border p-3">
        <div class="flex items-center justify-between">
          <span class="text-c-1 font-semibold"
            >Guia Padrão OpenAPI &amp; DX</span
          >
          <span class="text-c-3 text-xs">docs/guides/</span>
        </div>
        <p class="text-c-2 text-xs">
          Padrões de design de endpoints, contratos REST, tags semânticas e
          exemplos executáveis.
        </p>
      </div>

      <div class="flex flex-col gap-1 rounded-md border p-3">
        <div class="flex items-center justify-between">
          <span class="text-c-1 font-semibold"
            >Guia de Arquitetura do Fork</span
          >
          <span class="text-c-3 text-xs">docs/guides/</span>
        </div>
        <p class="text-c-2 text-xs">
          Visão geral da estrutura de pacotes, convenções de commits, Sandboxing
          Zero-Trust e MCP.
        </p>
      </div>
    </div>
  </div>
</template>
