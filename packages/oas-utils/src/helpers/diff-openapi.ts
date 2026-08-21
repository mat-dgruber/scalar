export type ChangeType = 'added' | 'removed' | 'changed' | 'deprecated'
export type ChangeSeverity = 'breaking' | 'non-breaking' | 'warning' | 'info'

export interface OpenApiDiffItem {
  type: ChangeType
  severity: ChangeSeverity
  path: string
  method?: string
  message: string
  details?: Record<string, any>
}

export interface OpenApiDiffResult {
  hasBreakingChanges: boolean
  totalChanges: number
  breakingCount: number
  diffs: OpenApiDiffItem[]
  markdownChangelog: string
}

/**
 * Compares two OpenAPI documents and identifies breaking changes, modifications, additions, and deprecations
 */
export function diffOpenApiDocuments(
  baseDoc: Record<string, any> | undefined | null,
  updatedDoc: Record<string, any> | undefined | null,
): OpenApiDiffResult {
  const diffs: OpenApiDiffItem[] = []

  const basePaths = baseDoc?.paths ?? {}
  const updatedPaths = updatedDoc?.paths ?? {}

  const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace']

  // 1. Check for removed or modified paths
  for (const [pathKey, basePathItem] of Object.entries(basePaths)) {
    const updatedPathItem = updatedPaths[pathKey]

    if (!updatedPathItem) {
      diffs.push({
        type: 'removed',
        severity: 'breaking',
        path: pathKey,
        message: `Endpoint completely removed: ${pathKey}`,
      })
      continue
    }

    // Check methods for this path
    for (const method of HTTP_METHODS) {
      const baseOp = (basePathItem as any)?.[method]
      const updatedOp = (updatedPathItem as any)?.[method]

      if (baseOp && !updatedOp) {
        diffs.push({
          type: 'removed',
          severity: 'breaking',
          path: pathKey,
          method,
          message: `Operation removed: ${method.toUpperCase()} ${pathKey}`,
        })
      } else if (!baseOp && updatedOp) {
        diffs.push({
          type: 'added',
          severity: 'non-breaking',
          path: pathKey,
          method,
          message: `New operation added: ${method.toUpperCase()} ${pathKey}`,
        })
      } else if (baseOp && updatedOp) {
        // Check for deprecation
        if (!baseOp.deprecated && updatedOp.deprecated) {
          diffs.push({
            type: 'deprecated',
            severity: 'warning',
            path: pathKey,
            method,
            message: `Operation deprecated: ${method.toUpperCase()} ${pathKey}`,
          })
        }

        // Check for added required parameters (BREAKING)
        const baseParams: any[] = [...((basePathItem as any)?.parameters || []), ...((baseOp as any)?.parameters || [])]
        const updatedParams: any[] = [
          ...((updatedPathItem as any)?.parameters || []),
          ...((updatedOp as any)?.parameters || []),
        ]

        for (const uParam of updatedParams) {
          if (uParam?.required) {
            const bParam = baseParams.find((p) => p.name === uParam.name && p.in === uParam.in)
            if (!bParam) {
              diffs.push({
                type: 'added',
                severity: 'breaking',
                path: pathKey,
                method,
                message: `New required parameter added: '${uParam.name}' in ${uParam.in} on ${method.toUpperCase()} ${pathKey}`,
              })
            } else if (!bParam.required) {
              diffs.push({
                type: 'changed',
                severity: 'breaking',
                path: pathKey,
                method,
                message: `Parameter changed from optional to required: '${uParam.name}' in ${uParam.in} on ${method.toUpperCase()} ${pathKey}`,
              })
            }
          }
        }

        // Check for removed response status codes (BREAKING)
        const baseResponses = baseOp?.responses || {}
        const updatedResponses = updatedOp?.responses || {}

        for (const statusCode of Object.keys(baseResponses)) {
          if (statusCode.startsWith('2') && !updatedResponses[statusCode]) {
            diffs.push({
              type: 'removed',
              severity: 'breaking',
              path: pathKey,
              method,
              message: `Success response status code ${statusCode} removed on ${method.toUpperCase()} ${pathKey}`,
            })
          }
        }
      }
    }
  }

  // 2. Check for completely new paths
  for (const [pathKey] of Object.entries(updatedPaths)) {
    if (!basePaths[pathKey]) {
      diffs.push({
        type: 'added',
        severity: 'non-breaking',
        path: pathKey,
        message: `New endpoint added: ${pathKey}`,
      })
    }
  }

  const breakingCount = diffs.filter((d) => d.severity === 'breaking').length
  const hasBreakingChanges = breakingCount > 0

  // Generate markdown changelog
  let markdown = '## API Changes & Breaking Detection\n\n'
  if (diffs.length === 0) {
    markdown += 'No changes detected between specifications.\n'
  } else {
    if (hasBreakingChanges) {
      markdown += `> [!CAUTION]\n> **${breakingCount} Breaking Change(s) Detected!**\n\n`
    }

    const breakingDiffs = diffs.filter((d) => d.severity === 'breaking')
    if (breakingDiffs.length > 0) {
      markdown += '### 🚨 Breaking Changes\n'
      for (const item of breakingDiffs) {
        markdown += `- 🔴 **${item.type.toUpperCase()}**: ${item.message}\n`
      }
      markdown += '\n'
    }

    const warningDiffs = diffs.filter((d) => d.severity === 'warning')
    if (warningDiffs.length > 0) {
      markdown += '### ⚠️ Deprecations & Warnings\n'
      for (const item of warningDiffs) {
        markdown += `- 🟡 ${item.message}\n`
      }
      markdown += '\n'
    }

    const nonBreakingDiffs = diffs.filter((d) => d.severity === 'non-breaking')
    if (nonBreakingDiffs.length > 0) {
      markdown += '### ✨ Additions & Non-Breaking Changes\n'
      for (const item of nonBreakingDiffs) {
        markdown += `- 🟢 ${item.message}\n`
      }
      markdown += '\n'
    }
  }

  return {
    hasBreakingChanges,
    totalChanges: diffs.length,
    breakingCount,
    diffs,
    markdownChangelog: markdown.trim(),
  }
}
