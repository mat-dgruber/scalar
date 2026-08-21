import type { Document as OpenApiDocumentV3_1 } from '@scalar/openapi-types/3.1'
import { upgrade as originalUpgrade } from '@scalar/openapi-upgrader'

import type { Filesystem, UnknownObject, UpgradeResult } from '@/types/index'

import { getEntrypoint } from './get-entrypoint'
import { isFilesystem } from './is-filesystem'
import { normalize } from './normalize'

/**
 * Upgrade specification to OpenAPI 3.1.0
 */
export function upgrade(value: string | UnknownObject | Filesystem): UpgradeResult<OpenApiDocumentV3_1> {
  if (!value) {
    return {
      specification: null,
      version: '3.1',
    }
  }

  if (isFilesystem(value)) {
    for (const entry of value) {
      if (entry.specification) {
        entry.specification = originalUpgrade(entry.specification, '3.1')
      }
    }
  }

  const document = isFilesystem(value)
    ? getEntrypoint(value).specification
    : (originalUpgrade(normalize(value) as UnknownObject, '3.1') as OpenApiDocumentV3_1)

  return {
    specification: document,
    version: '3.1',
  } as UpgradeResult<OpenApiDocumentV3_1>
}
