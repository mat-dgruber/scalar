# Design Doc: Standalone Modular MCP Server Enhancements

**Data**: 2026-08-24  
**Status**: Aprovado  
**Escopo**: `@scalar/mcp-server`  
**Alvo**: OpenClaude & Antigravity  

---

## 1. Contexto e Motivação

O pacote `@scalar/mcp-server` foi introduzido como um servidor MCP 100% autônomo e desacoplado de serviços de nuvem ou proxies proprietários da Scalar. 

Este design especifica a evolução da arquitetura do servidor MCP para um modelo modular em camadas, fornecendo:
1. **Inteligência OpenAPI Dinâmica**: Descoberta híbrida de especificações OpenAPI locais/remotas com ferramentas de busca e execução estruturada de rotas.
2. **Operações e Diagnósticos de Infraestrutura**: Verificações reais de conectividade (ping HTTP/TCP, latência em ms, diagnósticos de falha de conexão).
3. **Gestão de Ambientes e Segurança Zero-Trust**: Alternância dinâmica de ambientes (`local`, `dev`, `staging`), mascaramento preventivo de credenciais e headers sensíveis.
4. **Recursos Nativos (MCP Resources)**: Exposição de `openapi://spec` e `infra://health-status` como recursos legíveis do protocolo MCP.

---

## 2. Arquitetura do Sistema

O servidor adota o padrão de Clean Architecture e separação de responsabilidades:

```
packages/mcp-server/src/
├── index.ts                      # Bootstrap do servidor Stdio JSON-RPC 2.0 e registro de handlers
├── core/
│   ├── config.ts                 # Gerenciamento de ambientes, URLs base e tokens
│   └── sanitizer.ts              # Utilitários de mascaramento de segredos e headers
├── openapi/
│   ├── loader.ts                 # Descoberta em cascata da especificação OpenAPI
│   ├── parser.ts                 # Indexação, busca e filtragem de rotas e schemas
│   └── executor.ts               # Cliente HTTP com timeouts e injeção segura de autenticação
├── infra/
│   ├── health.ts                 # Testes de conectividade real e medição de latência
│   └── diagnostics.ts            # Consolidado de saúde dos microsserviços
└── resources/
    └── index.ts                  # Provedores de Resources nativos do protocolo MCP
```

---

## 3. Especificação de Ferramentas (Tools)

### 3.1 `openapi_descobrir_rotas`
- **Descrição**: Busca e filtra rotas da API com detalhes sobre método, resumo, parâmetros de consulta/rota e corpo de requisição esperado.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Termo de busca textual no path ou summary" },
      "tag": { "type": "string", "description": "Filtrar rotas por tag OpenAPI" },
      "metodo": { "type": "string", "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"], "description": "Filtrar por método HTTP" }
    }
  }
  ```
- **Retorno**: Lista estruturada de endpoints correspondentes com schemas resumidos.

### 3.2 `openapi_executar_requisicao`
- **Descrição**: Executa requisições REST autenticadas contra endpoints descobertos usando a URL base do ambiente ativo.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "endpoint": { "type": "string", "description": "Caminho do endpoint relativo (ex: /usuarios)" },
      "metodo": { "type": "string", "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"], "description": "Método HTTP" },
      "params": { "type": "object", "description": "Parâmetros de query string (opcional)" },
      "payload": { "type": "object", "description": "Corpo da requisição em JSON (opcional)" },
      "headers": { "type": "object", "description": "Headers HTTP customizados (opcional)" },
      "ambiente": { "type": "string", "description": "Sobrescrever temporariamente o ambiente de destino (opcional)" }
    },
    "required": ["endpoint", "metodo"]
  }
  ```
- **Retorno**: Status HTTP, latência de execução em ms, headers de resposta seguros e corpo sanitizado.

### 3.3 `infra_diagnosticar_servico`
- **Descrição**: Executa teste de conectividade de rede real (HTTP ping) medindo latência e validando integridade.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "URL completa ou relativa a testar" },
      "servico": { "type": "string", "description": "Nome do serviço cadastrado para diagnóstico rápido" },
      "timeoutMs": { "type": "number", "description": "Timeout máximo em ms (padrão: 5000)" }
    }
  }
  ```
- **Retorno**: Status (`UP` / `DOWN`), código HTTP, latência em ms, timestamp e mensagem de erro explicativa em caso de falha.

### 3.4 `ambiente_gerenciar`
- **Descrição**: Consulta, lista ou altera o ambiente ativo de execução (`local`, `dev`, `staging`).
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "acao": { "type": "string", "enum": ["listar", "obter", "trocar"], "description": "Ação a executar" },
      "ambiente": { "type": "string", "description": "Nome do ambiente a ativar (obrigatório se acao=trocar)" }
    },
    "required": ["acao"]
  }
  ```
- **Retorno**: Detalhes do ambiente ativo, URLs base associadas e variáveis mascaradas.

---

## 4. Especificação de Recursos Nativos (MCP Resources)

1. **`openapi://spec`**:
   - **MIME**: `application/json`
   - **Descrição**: Retorna o documento OpenAPI atualmente carregado em formato JSON.
2. **`infra://health-status`**:
   - **MIME**: `application/json`
   - **Descrição**: Fornece um snapshot em tempo real do status de saúde e conectividade dos serviços locais e de intranet monitorados.

---

## 5. Gestão de Ambientes e Segurança Zero-Trust

- **Mascaramento Preventivo**: Todos os headers (`Authorization`, `X-Api-Key`, `Cookie`) e campos de payload (`password`, `token`, `secret`) são sanitizados antes de serem transmitidos ao LLM.
- **Timeouts Controlados**: Requisições HTTP possuem timeout padrão de 10.000ms com cancelamento via `AbortController`.
- **Isolamento de Processo**: O transporte Stdio executa isolado sem expor portas de rede adicionais para o servidor MCP em si.

---

## 6. Estratégia de Testes

- Testes unitários com Vitest em `packages/mcp-server/src/__tests__/`:
  - `loader.test.ts`: Validação do algoritmo de descoberta em cascata de OpenAPI.
  - `parser.test.ts`: Filtragem de rotas, matching de termos e tags.
  - `sanitizer.test.ts`: Mascaramento correto de tokens e headers sensíveis.
  - `config.test.ts`: Troca e persistência em memória de ambientes.

---

## 7. Spec Self-Review

- **Placeholder Scan**: Não há seções TBD ou incompletas.
- **Consistência Interna**: Todas as ferramentas e recursos definidos possuem contratos correspondentes na estrutura modular.
- **Escopo**: Focado exclusivamente no pacote `packages/mcp-server`.
- **Ambiguidade**: Nomes de schemas, métodos suportados e retornos definidos de forma explícita.
