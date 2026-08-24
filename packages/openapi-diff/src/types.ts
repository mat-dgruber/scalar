export type ChangeType = 'breaking' | 'non-breaking' | 'unclassified' | 'deprecated'

export type ChangeCategory = 'path' | 'operation' | 'parameter' | 'requestBody' | 'response' | 'schema' | 'security'

export type ChangeAction = 'added' | 'removed' | 'modified' | 'deprecated'

export type SemVerBump = 'major' | 'minor' | 'patch' | 'none'

export interface SemanticChange {
  type: ChangeType
  category: ChangeCategory
  action: ChangeAction
  location: string
  message: string
  oldValue?: unknown
  newValue?: unknown
}

export interface DiffResult {
  hasChanges: boolean
  breaking: SemanticChange[]
  nonBreaking: SemanticChange[]
  deprecated: SemanticChange[]
  unclassified: SemanticChange[]
  totalChanges: number
  recommendedBump: SemVerBump
}
