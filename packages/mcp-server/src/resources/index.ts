import { runFullDiagnostics } from '../infra/diagnostics.js'
import { loadOpenApiSpec } from '../openapi/loader.js'

export function listMcpResources() {
  return [
    {
      uri: 'openapi://spec',
      name: 'OpenAPI Specification',
      description: 'Especificação OpenAPI completa carregada do projeto ativo.',
      mimeType: 'application/json',
    },
    {
      uri: 'infra://health-status',
      name: 'Status de Saúde da Infraestrutura',
      description: 'Snapshot consolidado de conectividade e status dos microsserviços.',
      mimeType: 'application/json',
    },
  ]
}

export async function readMcpResource(uri: string) {
  switch (uri) {
    case 'openapi://spec': {
      const spec = (await loadOpenApiSpec()) || {
        info: { title: 'No OpenAPI spec found', version: '0.0.0' },
        paths: {},
      }
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(spec, null, 2),
      }
    }

    case 'infra://health-status': {
      const diag = await runFullDiagnostics()
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(diag, null, 2),
      }
    }

    default: {
      throw new Error(`Resource não encontrado para URI: ${uri}`)
    }
  }
}
