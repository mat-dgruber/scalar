// import { codeFrameColumns } from '@babel/code-frame';
// import chalk from 'chalk';
// import { getMetaFromPath } from '@/json/index'

export default class BaseValidationError {
  public options: any
  public data: any
  public schema: any
  public jsonAst: any
  public jsonRaw: any
  public name?: string

  constructor(options: any = { isIdentifierLocation: false }, extra: any = {}) {
    this.options = options
    this.data = extra?.data
    this.schema = extra?.schema
    this.jsonAst = extra?.jsonAst
    this.jsonRaw = extra?.jsonRaw
  }

  /**
   * @return {string}
   */
  get instancePath(): string {
    return typeof this.options.instancePath !== 'undefined' ? this.options.instancePath : this.options.dataPath
  }

  getError(): any {
    throw new Error(`Implement the 'getError' method inside ${this.constructor.name}!`)
  }
}
