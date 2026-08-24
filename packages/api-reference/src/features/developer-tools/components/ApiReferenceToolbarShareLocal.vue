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
    toast(`${translate('developerTools.downloaded')} openapi.${format}`, 'info')
  } catch (_error) {
    toast(translate('developerTools.unknownError'), 'error')
  }
}

async function handleCopySpec() {
  const document = props.workspace?.exportActiveDocument('json')
  if (!document) {
    toast(translate('developerTools.unableToExportDocument'), 'error')
    return
  }
  await copyToClipboard(document)
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
  } catch (_error) {
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
      <span class="text-c-2 text-xs font-semibold tracking-wide uppercase">
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
      <span class="text-c-2 text-xs font-semibold tracking-wide uppercase">
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
