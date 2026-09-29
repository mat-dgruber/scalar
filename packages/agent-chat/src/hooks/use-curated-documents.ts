import { onMounted } from 'vue'

import { useState } from '@/state/state'

export function useCuratedDocuments() {
  const { api, curatedDocuments, mode, baseUrl } = useState()

  onMounted(async () => {
    // Avoid calling external Scalar cloud in embedded reference mode or when baseUrl is empty
    if (mode !== 'full' || !baseUrl) {
      return
    }

    const getCuratedDocumentsResult = await api.getCuratedDocuments()

    if (!getCuratedDocumentsResult.success) {
      return
    }

    curatedDocuments.value = getCuratedDocumentsResult.data.results
  })
}
