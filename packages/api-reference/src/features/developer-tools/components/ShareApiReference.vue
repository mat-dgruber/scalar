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
