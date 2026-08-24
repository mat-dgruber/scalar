<script lang="ts" setup>
import { ScalarFormSection } from '@scalar/components/form'

import { useLocalization } from '@/features/localization'

import ApiReferenceToolbarIntegrate from './ApiReferenceToolbarIntegrate.vue'
import ApiReferenceToolbarPopover from './ApiReferenceToolbarPopover.vue'

const { translate } = useLocalization()
</script>

<template>
  <ApiReferenceToolbarPopover class="w-128">
    <template #label>{{ translate('developerTools.integrate') }}</template>
    <ScalarFormSection>
      <template #label>{{
        translate('developerTools.integrateTitle')
      }}</template>
      <p class="text-c-2 mb-3 text-sm leading-normal">
        {{ translate('developerTools.integrateDescription') }}
      </p>
      <ApiReferenceToolbarIntegrate />
    </ScalarFormSection>
  </ApiReferenceToolbarPopover>
</template>
