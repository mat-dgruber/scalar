import BaseValidationError from './base'

export default class RequiredValidationError extends BaseValidationError {
  constructor(options: any = {}, extra: any = {}) {
    super(options, extra)
    this.name = 'RequiredValidationError'
  }

  override getError() {
    const { message } = this.options

    return {
      message: `${message}`,
      path: this.instancePath,
    }
  }
}
