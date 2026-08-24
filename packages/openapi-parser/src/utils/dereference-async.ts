import type { AnyApiDefinitionFormat, DereferenceResult, Filesystem } from '@/types/index'

import type { DereferenceOptions } from './dereference'
import { dereference } from './dereference'

/**
 * Executa o dereferencing de forma assíncrona liberando a thread principal do navegador / Node.js
 * para evitar travamentos de interface em especificações OpenAPI gigantes (>50MB).
 */
export async function dereferenceAsync(
  value: AnyApiDefinitionFormat | Filesystem,
  options?: DereferenceOptions,
): Promise<DereferenceResult> {
  await new Promise<void>((resolve) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(resolve)
    } else {
      setTimeout(resolve, 0)
    }
  })

  return dereference(value, options)
}
