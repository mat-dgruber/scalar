---
'@scalar/api-reference': minor
---

feat(api-reference): replace cloud share/deploy with zero-backend local tools

- Share: download JSON/YAML, copy spec to clipboard, generate client-side preview link via URL hash compression
- Integrate: framework integration snippets (Express, Fastify, NestJS, Hono, FastAPI, HTML/CDN) and internal guide access
- Remove DeployApiReference (external Scalar cloud endpoints)
- Add URL hash spec loader (#spec=...) for zero-backend preview sharing
- Update all 8 locale files with new Integrate/Share keys
