import type { Workspace } from '@/schemas/workspace'

export type Layout = 'web' | 'other'

/**
 * Returns the default proxy URL.
 * In this self-hosted environment, returns null by default to avoid leaking
 * requests or routing traffic through external cloud proxy servers.
 */
export const getDefaultProxyUrl = (_layout: Layout) => {
  return null
}

/**
 * Returns the active proxy URL for the workspace.
 *
 * Logic:
 * - If the active proxy url is not set, use the default proxy url.
 * - Otherwise, use the active proxy url.
 */
export const getActiveProxyUrl = (activeProxyUrl: Workspace['x-scalar-active-proxy'], layout: Layout) => {
  // If the active proxy url is not set, use the default proxy url
  if (activeProxyUrl === undefined) {
    return getDefaultProxyUrl(layout)
  }
  return activeProxyUrl
}
