---
'@scalar/types': minor
'@scalar/schemas': minor
'@scalar/agent-chat': minor
'@scalar/api-reference': minor
---

feat(agent): support Google Gemini Bring-Your-Own-Key (BYOK) and model selection

- Add `GeminiConfig`, `GeminiModel`, and `AgentConfiguration` schemas and types supporting `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-pro`, `gemini-3.1-flash-lite`, `gemini-2.5-pro`, `gemini-2.5-flash`, and custom model identifiers.
- Add `GeminiChatTransport` with direct streaming Server-Sent Events (SSE) and full tool calling translation (`execute-request`, `search-openapi-operations`, `ask-for-authentication`).
- Add in-chat `AgentSettingsModal` allowing live model selection, API key configuration, and optional proxy URL with `localStorage` persistence.
