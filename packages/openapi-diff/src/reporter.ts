import type { DiffResult } from './types.js'

/**
 * Gera relatório visual em Markdown detalhando breaking changes, melhorias e recomendações SemVer
 */
export function formatDiffMarkdown(result: DiffResult): string {
  if (!result.hasChanges) {
    return '### ✅ Nenhuma alteração detectada entre as especificações OpenAPI.'
  }

  const lines: string[] = []

  lines.push('## 🔄 Relatório de Mudanças Semânticas OpenAPI')
  lines.push('')
  lines.push(`**Recomendação SemVer:** \`${result.recommendedBump.toUpperCase()}\``)
  lines.push(`- **Breaking Changes (Críticas):** ${result.breaking.length}`)
  lines.push(`- **Adições Compatíveis:** ${result.nonBreaking.length}`)
  lines.push(`- **Depreciações:** ${result.deprecated.length}`)
  lines.push('')

  if (result.breaking.length > 0) {
    lines.push('### 🚨 Breaking Changes (Incompatíveis)')
    for (const change of result.breaking) {
      lines.push(`- **[${change.category.toUpperCase()}]** \`${change.location}\`: ${change.message}`)
    }
    lines.push('')
  }

  if (result.nonBreaking.length > 0) {
    lines.push('### ✨ Novas Funcionalidades / Adições Compatíveis')
    for (const change of result.nonBreaking) {
      lines.push(`- **[${change.category.toUpperCase()}]** \`${change.location}\`: ${change.message}`)
    }
    lines.push('')
  }

  if (result.deprecated.length > 0) {
    lines.push('### ⚠️ Depreciações')
    for (const change of result.deprecated) {
      lines.push(`- **[${change.category.toUpperCase()}]** \`${change.location}\`: ${change.message}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
