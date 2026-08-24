import type { DiffResult, SemVerBump, SemanticChange } from './types.js'

/**
 * Compara dois documentos OpenAPI (v2, v3.0, v3.1) e identifica semanticamente as mudanças e breaking changes
 */
export function diffOpenApi(oldSpec: Record<string, any> = {}, newSpec: Record<string, any> = {}): DiffResult {
  const changes: SemanticChange[] = []

  const oldPaths = oldSpec.paths || {}
  const newPaths = newSpec.paths || {}

  // 1. Comparação de Paths
  const allPathKeys = Array.from(new Set([...Object.keys(oldPaths), ...Object.keys(newPaths)]))

  for (const pathKey of allPathKeys) {
    const oldPathItem = oldPaths[pathKey]
    const newPathItem = newPaths[pathKey]

    if (oldPathItem && !newPathItem) {
      changes.push({
        type: 'breaking',
        category: 'path',
        action: 'removed',
        location: `paths['${pathKey}']`,
        message: `Rota '${pathKey}' foi completamente removida da API.`,
        oldValue: oldPathItem,
      })
      continue
    }

    if (!oldPathItem && newPathItem) {
      changes.push({
        type: 'non-breaking',
        category: 'path',
        action: 'added',
        location: `paths['${pathKey}']`,
        message: `Nova rota '${pathKey}' adicionada à API.`,
        newValue: newPathItem,
      })
      continue
    }

    // 2. Comparação de Métodos/Operações na mesma rota
    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']
    for (const method of httpMethods) {
      const oldOp = oldPathItem[method]
      const newOp = newPathItem[method]

      if (oldOp && !newOp) {
        changes.push({
          type: 'breaking',
          category: 'operation',
          action: 'removed',
          location: `paths['${pathKey}'].${method.toUpperCase()}`,
          message: `Operação ${method.toUpperCase()} ${pathKey} foi removida.`,
          oldValue: oldOp,
        })
        continue
      }

      if (!oldOp && newOp) {
        changes.push({
          type: 'non-breaking',
          category: 'operation',
          action: 'added',
          location: `paths['${pathKey}'].${method.toUpperCase()}`,
          message: `Nova operação ${method.toUpperCase()} ${pathKey} adicionada.`,
          newValue: newOp,
        })
        continue
      }

      if (oldOp && newOp) {
        // Checar depreciação
        if (!oldOp.deprecated && newOp.deprecated) {
          changes.push({
            type: 'deprecated',
            category: 'operation',
            action: 'deprecated',
            location: `paths['${pathKey}'].${method.toUpperCase()}`,
            message: `Operação ${method.toUpperCase()} ${pathKey} foi marcada como obsoleta (deprecated).`,
          })
        }

        // Checar parâmetros
        compareParameters(pathKey, method, oldOp.parameters || [], newOp.parameters || [], changes)

        // Checar Request Body
        compareRequestBody(pathKey, method, oldOp.requestBody, newOp.requestBody, changes)

        // Checar Responses
        compareResponses(pathKey, method, oldOp.responses || {}, newOp.responses || {}, changes)
      }
    }
  }

  // Classificação dos resultados
  const breaking = changes.filter((c) => c.type === 'breaking')
  const nonBreaking = changes.filter((c) => c.type === 'non-breaking')
  const deprecated = changes.filter((c) => c.type === 'deprecated')
  const unclassified = changes.filter((c) => c.type === 'unclassified')

  let recommendedBump: SemVerBump = 'none'
  if (breaking.length > 0) {
    recommendedBump = 'major'
  } else if (nonBreaking.length > 0 || deprecated.length > 0) {
    recommendedBump = 'minor'
  } else if (changes.length > 0) {
    recommendedBump = 'patch'
  }

  return {
    hasChanges: changes.length > 0,
    breaking,
    nonBreaking,
    deprecated,
    unclassified,
    totalChanges: changes.length,
    recommendedBump,
  }
}

function compareParameters(
  path: string,
  method: string,
  oldParams: any[],
  newParams: any[],
  changes: SemanticChange[],
) {
  const oldParamMap = new Map(oldParams.map((p) => [`${p.in}:${p.name}`, p]))
  const newParamMap = new Map(newParams.map((p) => [`${p.in}:${p.name}`, p]))

  // Checar parâmetros removidos
  for (const [key, oldP] of oldParamMap.entries()) {
    if (!newParamMap.has(key)) {
      changes.push({
        type: oldP.required ? 'breaking' : 'non-breaking',
        category: 'parameter',
        action: 'removed',
        location: `paths['${path}'].${method.toUpperCase()}.parameters[${oldP.name}]`,
        message: `Parâmetro de ${oldP.in} '${oldP.name}' foi removido.`,
        oldValue: oldP,
      })
    }
  }

  // Checar parâmetros adicionados e modificados
  for (const [key, newP] of newParamMap.entries()) {
    const oldP = oldParamMap.get(key)

    if (!oldP) {
      // Novo parâmetro obrigatório é breaking change!
      const isRequired = Boolean(newP.required || newP.in === 'path')
      changes.push({
        type: isRequired ? 'breaking' : 'non-breaking',
        category: 'parameter',
        action: 'added',
        location: `paths['${path}'].${method.toUpperCase()}.parameters[${newP.name}]`,
        message: isRequired
          ? `Novo parâmetro OBRIGATÓRIO '${newP.name}' adicionado em ${newP.in}.`
          : `Novo parâmetro opcional '${newP.name}' adicionado em ${newP.in}.`,
        newValue: newP,
      })
    } else {
      // Modificações de opcional -> obrigatório
      if (!oldP.required && newP.required) {
        changes.push({
          type: 'breaking',
          category: 'parameter',
          action: 'modified',
          location: `paths['${path}'].${method.toUpperCase()}.parameters[${newP.name}]`,
          message: `Parâmetro '${newP.name}' tornou-se OBRIGATÓRIO.`,
        })
      }

      // Mudança de tipo no schema
      const oldType = oldP.schema?.type || oldP.type
      const newType = newP.schema?.type || newP.type
      if (oldType && newType && oldType !== newType) {
        changes.push({
          type: 'breaking',
          category: 'parameter',
          action: 'modified',
          location: `paths['${path}'].${method.toUpperCase()}.parameters[${newP.name}].type`,
          message: `Tipo do parâmetro '${newP.name}' alterado de '${oldType}' para '${newType}'.`,
          oldValue: oldType,
          newValue: newType,
        })
      }
    }
  }
}

function compareRequestBody(path: string, method: string, oldBody: any, newBody: any, changes: SemanticChange[]) {
  if (!oldBody && newBody) {
    if (newBody.required) {
      changes.push({
        type: 'breaking',
        category: 'requestBody',
        action: 'added',
        location: `paths['${path}'].${method.toUpperCase()}.requestBody`,
        message: `Corpo de requisição OBRIGATÓRIO adicionado em ${method.toUpperCase()} ${path}.`,
      })
    } else {
      changes.push({
        type: 'non-breaking',
        category: 'requestBody',
        action: 'added',
        location: `paths['${path}'].${method.toUpperCase()}.requestBody`,
        message: `Corpo de requisição opcional adicionado em ${method.toUpperCase()} ${path}.`,
      })
    }
    return
  }

  if (oldBody && newBody) {
    if (!oldBody.required && newBody.required) {
      changes.push({
        type: 'breaking',
        category: 'requestBody',
        action: 'modified',
        location: `paths['${path}'].${method.toUpperCase()}.requestBody`,
        message: 'Corpo de requisição passou a ser OBRIGATÓRIO.',
      })
    }
  }
}

function compareResponses(
  path: string,
  method: string,
  oldResponses: Record<string, any>,
  newResponses: Record<string, any>,
  changes: SemanticChange[],
) {
  for (const [code, oldResp] of Object.entries(oldResponses)) {
    if (!newResponses[code]) {
      const isSuccess = code.startsWith('2')
      changes.push({
        type: isSuccess ? 'breaking' : 'non-breaking',
        category: 'response',
        action: 'removed',
        location: `paths['${path}'].${method.toUpperCase()}.responses['${code}']`,
        message: `Código de resposta HTTP ${code} foi removido.`,
        oldValue: oldResp,
      })
    }
  }

  for (const [code, newResp] of Object.entries(newResponses)) {
    if (!oldResponses[code]) {
      changes.push({
        type: 'non-breaking',
        category: 'response',
        action: 'added',
        location: `paths['${path}'].${method.toUpperCase()}.responses['${code}']`,
        message: `Novo código de resposta HTTP ${code} documentado.`,
        newValue: newResp,
      })
    }
  }
}
