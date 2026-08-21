import BaseValidationError from './base'

export default class AdditionalPropValidationError extends BaseValidationError {
  constructor(options: any = {}, extra: any = {}) {
    super(options, extra)
    this.name = 'AdditionalPropValidationError'
    this.options.isIdentifierLocation = true
  }

  override getError() {
    const { params } = this.options

    return {
      message: `Property ${params.additionalProperty} is not expected to be here`,
      path: this.instancePath,
    }
  }
}
