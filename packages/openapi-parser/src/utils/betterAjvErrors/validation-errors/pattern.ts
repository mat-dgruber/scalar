import BaseValidationError from './base'

export default class PatternValidationError extends BaseValidationError {
  constructor(options: any = {}, extra: any = {}) {
    super(options, extra)
    this.name = 'PatternValidationError'
    this.options.isIdentifierLocation = true
  }

  override getError() {
    const { params, propertyName } = this.options

    return {
      message: `Property "${propertyName}" must match pattern ${params.pattern}`,
      path: this.instancePath,
    }
  }
}
