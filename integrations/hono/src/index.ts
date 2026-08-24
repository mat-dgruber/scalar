import { scalarMcp } from './mcp'
import { Scalar } from './scalar'

export {
  Scalar,
  scalarMcp,
  /**
   * @deprecated Use `Scalar` instead.
   */
  Scalar as apiReference,
}

export type { ScalarMcpOptions } from './mcp'
export type { ApiReferenceConfiguration } from './types'
