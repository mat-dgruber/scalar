---
'@scalar/types': minor
'@scalar/schemas': minor
'@scalar/agent-chat': minor
'@scalar/workspace-store': minor
'@scalar/api-reference': minor
'@scalar/helpers': patch
'@scalar/components': patch
---

feat: add gemini-3.8-flash model support and isolate from external Scalar cloud infrastructure

- Adiciona suporte ao modelo `gemini-3.8-flash` como padrão recomendado no Chat, Ask AI e schemas de configuração.
- Desativa telemetria por padrão (`telemetry: false`).
- Remove fallbacks automáticos para `https://proxy.scalar.com`, garantindo requisições diretas ou via proxy local corporativo.
- Isola o carregamento de fontes remotas externas (`withDefaultFonts: false` por padrão) utilizando stack de fontes nativas do sistema.
- Neutraliza chamadas remotas para `api.scalar.com/vector/registry/*` e referências de nuvem em `agent-chat` e `developer-tools`.
