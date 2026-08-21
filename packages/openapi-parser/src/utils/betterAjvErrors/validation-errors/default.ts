import BaseValidationError from './base'

export default class DefaultValidationError extends BaseValidationError {
  constructor(options: any = {}, extra: any = {}) {
    super(options, extra)
    this.name = 'DefaultValidationError'
    this.options.isSkipEndLocation = true
  }

  override getError() {
    const { keyword, message } = this.options

    return {
      message: `${keyword} ${message}`,
      path: this.instancePath,
    }
  }
}
