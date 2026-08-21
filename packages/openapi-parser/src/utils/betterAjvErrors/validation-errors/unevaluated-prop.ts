import BaseValidationError from './base'

export default class UnevaluatedPropValidationError extends BaseValidationError {
  constructor(options: any = {}, extra: any = {}) {
    super(options, extra)
    this.name = 'UnevaluatedPropValidationError'
    this.options.isIdentifierLocation = true
  }

  override getError() {
    const { params } = this.options

    return {
      message: `Property ${params.unevaluatedProperty} is not expected to be here`,
      path: this.instancePath,
    }
  }
}
