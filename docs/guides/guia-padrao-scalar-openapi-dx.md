# 📖 Guia Técnico de Padronização Scalar via FastAPI Auto-Hospedado (Foco em DX)

<!-- 
=================================================================================
LOG DE MANUTENÇÃO E ALTERAÇÕES DO DOCUMENTO
=================================================================================
Data       | Autor          | Descrição da Alteração
-----------|----------------|--------------------------------------------------
2026-08-19 | Matheus Diniz  | Criação do Guia Técnico de Padronização Scalar
           | (OpenClaude)   | e OpenAPI 3.1 para o ecossistema institucional (v1.0.0).
2026-08-19 | Matheus Diniz  | Reescrita para v2.0.0: foco exclusivo no auto-hospedado
           | (OpenClaude)   | via integração FastAPI (pacote scalar-fastapi),
           |                | migração da API legada data-* para get_scalar_api_reference,
           |                | matriz completa de parâmetros reais, deploy/ambientes
           |                | e boas práticas de DX.
2026-08-21 | Matheus Diniz  | Atualização v2.1.0: Instalação e inicialização direta do
           | (Antigravity)  | Fork Customizado (@mat-dgruber/scalar) nos projetos com
           |                | suporte nativo a Google Gemini (BYOK / Model Selector).
2026-08-21 | Matheus Diniz  | Atualização v2.2.0: Adicionado guia de autenticação GitHub
           | (Antigravity)  | PAT para consumo dos pacotes @mat-dgruber pela equipe.
=================================================================================
-->

> **Este guia é o padrão para inicializar e utilizar o Scalar nos nossos projetos (pessoais e da empresa)**, utilizando o **Fork Customizado (`@mat-dgruber/scalar`)** que inclui suporte nativo a **Google Gemini AI (BYOK - Bring Your Own Key)**, correções críticas e distribuição auto-hospedada (FastAPI / Vue / React / Node / CDN).

**A regra que rege tudo:** a qualidade da doc depende do seu documento OpenAPI — o Scalar apenas renderiza o que a sua API expõe.

---

## 🚀 1. Inicialização e Instalação nos Projetos (Forma Principal)

Utilizamos a versão do fork `@mat-dgruber/scalar` para garantir suporte a IA com Google Gemini, correções de schema e performance.

> **Os pacotes estão publicados no GitHub Packages** e exigem autenticação. Cada membro da equipe precisa gerar um **GitHub Personal Access Token (PAT)** uma vez na sua máquina.

---

### 🔑 Pré-requisito: Configurar Autenticação GitHub Packages

Esse passo é feito **uma única vez por máquina** e serve para todos os projetos.

**1. Gerar o token:**
- Acesse: [github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens/new)
- Marque **apenas**: ✅ `read:packages`
- Defina uma expiração (ex: 1 ano)
- Copie o token gerado (`ghp_...`)

**2. Configurar globalmente no npm (substitua `ghp_SEU_TOKEN` pelo seu token):**
```bash
npm config set //npm.pkg.github.com/:_authToken ghp_SEU_TOKEN
npm config set @mat-dgruber:registry https://npm.pkg.github.com
```

Pronto. Não é necessário mais nenhuma configuração por projeto.

> **Para CI/CD** (GitHub Actions, Jenkins, etc.), use a variável de ambiente `NODE_AUTH_TOKEN` no `.npmrc`:
> ```ini
> @mat-dgruber:registry=https://npm.pkg.github.com
> //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
> ```

---

### A. Instalação em Projetos Node / Vue / React / Next.js / NestJS

1. **Instalar o pacote** (após configurar o PAT acima):
   ```bash
   pnpm add @mat-dgruber/api-reference
   # ou com npm / yarn:
   npm install @mat-dgruber/api-reference
   ```

2. **Inicializar no seu código com Google Gemini:**

   ```typescript
   import { createApiReference } from '@mat-dgruber/api-reference'
   import '@mat-dgruber/api-reference/style.css'

   createApiReference('#app', {
     url: '/openapi.json',
     agent: {
       provider: 'gemini',
       gemini: {
         model: 'gemini-3.7-flash', // Padrão recomendado (ou gemini-2.5-pro, gemini-3.6-flash, etc.)
         apiKey: process.env.VITE_GEMINI_API_KEY, // Opcional (o usuário pode preencher via modal ⚙️ no chat)
       },
     },
   })
   ```

---

### B. Instalação e Uso em Projetos Angular (ex: `despesas-web`)

No Angular (Standalone Components ou Tradicional), o Scalar deve ser montado no ciclo de vida `AfterViewInit` utilizando um `ElementRef` e com `ViewEncapsulation.None` para garantir que o tema, os modais e o chat do Gemini renderizem perfeitamente:

1. **Instalar o pacote:**
   ```bash
   npm install @mat-dgruber/api-reference
   ```

2. **Criar o componente `ScalarDocsComponent` (`scalar-docs.component.ts`):**

   ```typescript
   import { Component, ElementRef, AfterViewInit, ViewChild, ViewEncapsulation } from '@angular/core';
   import { createApiReference } from '@mat-dgruber/api-reference';
   import '@mat-dgruber/api-reference/style.css';

   @Component({
     selector: 'app-scalar-docs',
     standalone: true,
     template: `
       <div #scalarContainer class="scalar-container"></div>
     `,
     styles: [`
       .scalar-container {
         width: 100%;
         height: 100vh;
         overflow-y: auto;
       }
     `],
     // ViewEncapsulation.None garante que o estilo e temas do Scalar se apliquem corretamente
     encapsulation: ViewEncapsulation.None,
   })
   export class ScalarDocsComponent implements AfterViewInit {
     @ViewChild('scalarContainer', { static: true }) scalarContainer!: ElementRef<HTMLDivElement>;

     ngAfterViewInit(): void {
       if (this.scalarContainer?.nativeElement) {
         createApiReference(this.scalarContainer.nativeElement, {
           url: 'https://api-gsd.cpb.com.br/v2/openapi.json', // ou sua URL da API
           agent: {
             provider: 'gemini',
             gemini: {
               model: 'gemini-3.7-flash', // Padrão recomendado
               // apiKey: 'opcional' -> o usuário pode configurar pelo modal ⚙️ no chat
             },
           },
         });
       }
     }
   }
   ```

---

### C. Inicialização em Projetos FastAPI / Python (Auto-Hospedado)

Você pode servir a documentação diretamente via FastAPI apontando para o bundle standalone do nosso fork:

```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(
    title="meuCPB API",
    version="1.0.0",
    description="Backend for Frontend (BFF) unificado.",
    openapi_url="/openapi.json",
)


@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    html_content = """
    <!doctype html>
    <html>
      <head>
        <title>Documentação da API</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div id="app"></div>
        <script src="https://cdn.jsdelivr.net/gh/mat-dgruber/scalar@main/packages/api-reference/dist/browser/standalone.js"></script>
        <script>
          Scalar.createApiReference('#app', {
            url: '/openapi.json',
            agent: {
              provider: 'gemini',
              gemini: {
                model: 'gemini-3.7-flash'
              }
            }
          })
        </script>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content)
```

---

### D. Como Funciona a Seleção de Modelos e BYOK no Chat

O Scalar integrado com Gemini possui um seletor visual e persistência automática:
- **Modelos Frontier (3.x)**: `gemini-3.7-flash` (Padrão), `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-pro`, `gemini-3.1-flash-lite`.
- **Modelos Stable (2.5)**: `gemini-2.5-pro`, `gemini-2.5-flash`.
- **Modelos Customizados**: Qualquer modelo suportado pela API do Google.
- **Hierarquia de Precedência:** `localStorage (Configurado via modal ⚙️ pelo usuário)` > `Props passadas no código` > `Default (gemini-3.7-flash)`.

---

## 🔧 2. Migração da API Legada `data-*` (Importante)

### A. Migrar da API legada `data-*` (Obrigatório)

A v1 usava `<script id="api-reference" data-url data-configuration>`. Esse é o caminho **legado**. O padrão oficial atual do Scalar é o método JavaScript `Scalar.createApiReference('#app', {...})`. No FastAPI você não escreve nem um nem outro à mão: o pacote `scalar-fastapi` gera o HTML por você e internamente chama `createApiReference`. Trocar HTML manual pela função é a mudança central desta versão.

### B. Usar o pacote first-party, não HTML (Obrigatório)

A v1 servia uma string HTML gigante dentro de `HTMLResponse`. Substitua por `get_scalar_api_reference()`. Você ganha tipagem, defaults corretos, enums (`Layout`, `Theme`, `SearchHotKey`), suporte a múltiplas fontes e configuração de Agent — sem manter HTML frágil no código Python.

### C. Nomes de parâmetro mudam

O objeto JS usa `camelCase`; o pacote Python usa `snake_case`. A tabela da v1 (`persistAuth`, `hideModels`, `searchHotKey`…) descreve a config JS. No FastAPI os nomes reais são `persist_auth`, `hide_models`, `search_hot_key`.

- `proxyUrl` → `scalar_proxy_url`
- `hideDownloadButton` → **deprecado**; use `document_download_type`
- `defaultHttpClient` não é parâmetro direto — passe via `overrides`

---

## 🚀 2. Setup Inicial (Executado Apenas Uma Vez)

### A. Instalar

```bash
pip install scalar-fastapi
# ou, no padrão uv do monorepo:
uv add scalar-fastapi
```

Fixe a versão no lockfile (`uv.lock` / `requirements.txt`) para builds reprodutíveis, alinhado ao princípio de pinning já adotado nos demais guias.

### B. Metadados Globais e Tags

As `tags` viram a estrutura da sidebar do Scalar. Declare-as com descrição. Título, versão e descrição do `FastAPI(...)` viram o cabeçalho da doc.

```python
from fastapi import FastAPI

tags_metadata = [
    {
        "name": "Segurança & Autenticação",
        "description": "Login LDAP, renovação e revogação de token.",
    },
    {
        "name": "Swile Benefícios",
        "description": "Saldos, cartões flexíveis e transferências entre carteiras.",
    },
]

app = FastAPI(
    title="meuCPB API",
    version="1.0.0",
    description="Backend for Frontend (BFF) unificado do ecossistema meuCPB.",
    openapi_tags=tags_metadata,
    openapi_url="/openapi.json",  # fonte viva da spec
)
```

### C. A Rota `/scalar` (Núcleo)

Uma rota que devolve a página do Scalar apontando para o OpenAPI da própria app.

```python
from scalar_fastapi import get_scalar_api_reference


@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,  # /openapi.json gerado pelo FastAPI
        title=app.title,
        scalar_proxy_url="https://proxy.scalar.com",  # evita CORS no "Test Request"
    )
```

- `include_in_schema=False` mantém a própria rota de docs fora do OpenAPI — não polui o spec.
- `app.openapi_url` em vez de string fixa: mudou o prefixo, a doc acompanha.
- O clássico `/docs` (Swagger UI) continua existindo; decida se mantém os dois.

### D. Múltiplas APIs numa Página

Se você serve mais de um documento (ex.: API pública e API admin), use `sources`.

```python
from scalar_fastapi import get_scalar_api_reference, OpenAPISource


@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        sources=[
            OpenAPISource(title="User API", url="/openapi.json", default=True),
            OpenAPISource(title="Admin API", url="/admin/openapi.json"),
        ],
        title="Documentação da API",
    )
```

`default=True` define qual documento abre primeiro. Cada fonte aceita `title`, `slug`, `url` ou `content` (mutuamente exclusivos) e um `agent` próprio.

---

## 🔒 3. Autenticação: o Dual-Scheme que Salva a DX

### A. O Erro que Quebra o Console (Crítico)

Configurar só `OAuth2PasswordBearer` força o Scalar a autenticar via formulário `x-www-form-urlencoded`; APIs JSON respondem `422` e o dev não consegue colar o Bearer. A correção é expor dois esquemas ao mesmo tempo: `HTTPBearer` (colar o JWT direto) e `OAuth2PasswordBearer` (documentar escopos RBAC).

### B. Padrão Recomendado

```python
from fastapi.security import HTTPBearer, OAuth2PasswordBearer

# Colagem direta do Bearer Token no Scalar / Swagger
http_bearer = HTTPBearer(
    auto_error=False,
    description="Insira o Token JWT retornado em /api/v1/auth/login",
)

# Especificação formal de escopos RBAC
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    scopes={
        "colaborador": "Acesso padrão.",
        "admin": "Acesso administrativo.",
    },
    auto_error=False,
)
```

A dependência `get_current_active_user` resolve o token em cascata: Cookie HttpOnly → cabeçalho Bearer → OAuth2, exatamente como descrito no Guia de Segurança (ADR 0033).

### C. Pré-preencher Auth = Maior Ganho de DX

Faça o dev testar em segundos com `authentication` + `persist_auth=True`.

```python
get_scalar_api_reference(
    openapi_url=app.openapi_url,
    persist_auth=True,  # lembra o token entre reloads (localStorage)
    authentication={
        "preferredSecurityScheme": "HTTPBearer",
        "securitySchemes": {
            "HTTPBearer": {"token": "cole-um-token-de-exemplo"},
        },
    },
)
```

Suporta API Key, HTTP Bearer, HTTP Basic e OAuth2 (incluindo PKCE). Nunca cole segredo real de produção aqui — apenas token de sandbox, seguindo a regra de "nunca credenciais reais".

---

## ⚙️ 4. Cada Função do Scalar (API Real do Pacote)

Assinatura de `get_scalar_api_reference()`. Nomes e defaults verificados na documentação oficial do `scalar-fastapi`.

### A. Núcleo e Fontes

| Parâmetro | Default | Função |
| :--- | :--- | :--- |
| `openapi_url` | `None` | URL do OpenAPI a carregar. Ignorado se `content`/`sources` forem passados. |
| `content` | `None` | Passa o documento OpenAPI direto (string JSON/YAML ou dict). |
| `sources` | `None` | Lista de `OpenAPISource` para renderizar várias APIs. |
| `title` | `"Scalar"` | Título da página de referência. |

### B. Exibição

| Parâmetro | Default | Função |
| :--- | :--- | :--- |
| `layout` | `Layout.MODERN` | `CLASSIC` replica o visual do Swagger UI. |
| `show_sidebar` | `True` | Navegação lateral com tags e endpoints. |
| `hide_models` | `False` | Esconde a seção de Schemas/Models. |
| `hide_search` | `False` | Esconde a barra de busca. |
| `hide_test_request_button` | `False` | Remove o botão "Test Request". |
| `document_download_type` | `BOTH` | Formato de download: `JSON`, `YAML`, `BOTH`, `NONE`. |
| `show_developer_tools` | `"localhost"` | Painel dev: `"always"`, `"localhost"`, `"never"`. |

*Depreciado:* `hide_download_button` — use `document_download_type`.

### C. Tema e Aparência

| Parâmetro | Default | Função |
| :--- | :--- | :--- |
| `theme` | `Theme.DEFAULT` | Tema da interface (`DEFAULT` ou `NONE` no enum do pacote). |
| `dark_mode` | `True` | Estado inicial do tema. |
| `force_dark_mode_state` | `None` | Trava em `'dark'` ou `'light'`. |
| `hide_dark_mode_toggle` | `False` | Esconde o botão de alternar tema. |
| `with_default_fonts` | `True` | Inter + JetBrains Mono; desligue para usar as suas. |
| `custom_css` | `""` | CSS próprio para casar com a marca. |

### D. Busca, Navegação e Schemas

| Parâmetro | Default | Função |
| :--- | :--- | :--- |
| `search_hot_key` | `SearchHotKey.K` | Atalho de busca; `CMD_K` ou `NONE`. |
| `default_open_all_tags` | `False` | Abre todas as tags de início. |
| `expand_all_model_sections` | `False` | Expande todos os models. |
| `expand_all_responses` | `False` | Expande todas as respostas. |
| `order_required_properties_first` | `True` | Campos obrigatórios primeiro no schema. |
| `order_schema_properties_by` | `"alpha"` | `"alpha"` ou `"preserve"`. |

### E. Servidores e Clientes de Snippet

| Parâmetro | Default | Função |
| :--- | :--- | :--- |
| `servers` | `[]` | Lista de Server Objects (prod/staging) para o dev escolher. |
| `base_server_url` | `""` | Prefixa servidores relativos com uma base URL. |
| `hidden_clients` | `[]` | Oculta linguagens/clientes de snippet irrelevantes. |
| `hide_client_button` | `False` | Esconde o botão do cliente na sidebar/modal. |

### F. Avançado e Agent

| Parâmetro | Default | Função |
| :--- | :--- | :--- |
| `scalar_js_url` | CDN jsdelivr | Fixe uma versão específica do renderer (pinning) ou aponte para CDN própria/offline. |
| `scalar_proxy_url` | `None` | Contorna CORS no cliente de teste. |
| `overrides` | `{}` | Injeta chaves cruas no config JS final (`defaultHttpClient`, `pathRouting`…). |
| `telemetry` | `True` | Desligue para não enviar telemetria de uso do cliente. |
| `agent` | `None` | `AgentScalarConfig(disabled=True)` desliga o chat de IA; `key=...` habilita em produção. |

### G. `defaultHttpClient` via `overrides`

Como não há parâmetro direto no pacote, defina o snippet padrão pelo `overrides`:

```python
get_scalar_api_reference(
    openapi_url=app.openapi_url,
    overrides={
        "defaultHttpClient": {"targetKey": "python", "clientKey": "httpx"},
    },
)
```

---

## 🌐 5. Deploy e Ambientes

### A. Não Há Deploy Separado (O Padrão)

Como a doc é uma rota da sua app FastAPI, ela sobe no mesmo deploy da API. Seu pipeline atual já publica a doc. Não existe passo de "publicar docs" à parte, nem workflow dedicado — essa é a vantagem central do auto-hospedado por integração.

- Fixe a versão do renderer via `scalar_js_url` apontando para uma versão específica da CDN, evitando quebra por atualização automática.
- Para ambiente offline/air-gapped, hospede o bundle do `@scalar/api-reference` na sua própria CDN e aponte `scalar_js_url` para lá.

### B. Config por Ambiente

Ajuste o comportamento conforme o ambiente para não expor coisas demais em produção:

```python
import os
from scalar_fastapi import get_scalar_api_reference, AgentScalarConfig

IS_PROD = os.getenv("ENV") == "production"


@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        scalar_proxy_url="https://proxy.scalar.com",
        show_developer_tools="never" if IS_PROD else "localhost",
        agent=AgentScalarConfig(disabled=True),
        servers=[
            {"url": "https://api.example.com", "description": "Production"},
            {"url": "https://staging.example.com", "description": "Staging"},
        ],
    )
```

### C. Chat de IA (Agent) — Cuidado em Produção

O Agent adiciona um chat de IA sobre sua API. Vem ligado só em `localhost` (mensagens grátis limitadas) e não aparece em produção sem uma chave. Se você não quer isso, desative explicitamente com `AgentScalarConfig(disabled=True)`.

*Observação de privacidade:* quando o Agent é usado, seu documento OpenAPI é enviado ao Scalar na primeira mensagem. Para um setup 100% auto-contido — coerente com o Guia de Segurança e a sandbox `ai-jail` — mantenha desativado.

### D. Deploy e Sincronia sem Plano Pago (Portal Estático Opcional)

Se você quiser publicar a doc como HTML estático fora da app (portal público separado), reproduza o "deploy no merge" sem pagar plano com um workflow de GitHub Actions. O FastAPI continua a fonte de verdade: você exporta o `openapi.json` no build e publica junto com o HTML do Scalar.

```yaml
name: Publicar docs estáticas

on:
  push:
    branches: [main]

jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"
      - name: Instalar deps e exportar OpenAPI
        run: |
          uv sync
          uv run python -c "import json, app.main as m; \
            open('site/openapi.json','w').write(json.dumps(m.app.openapi()))"
      - name: Gerar index.html do Scalar (aponta para ./openapi.json)
        run: |
          cat > site/index.html <<'HTML'
          <!doctype html><html><head><meta charset="utf-8">
          <title>API Docs</title></head><body><div id="app"></div>
          <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.0"></script>
          <script>Scalar.createApiReference('#app', { url: './openapi.json' })</script>
          </body></html>
          HTML
      - name: Publicar no GitHub Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: site
```

---

## ✨ 6. Boas Práticas de Documentação e DX

### A. O Trabalho Está no Spec, Não no Scalar (Regra de Ouro)

O Scalar renderiza exatamente o que o FastAPI gera. Doc boa é spec bom. No FastAPI isso significa caprichar nos elementos que viram o OpenAPI:

- `summary` e `description` em cada rota (docstrings viram descrição, com Markdown).
- `response_model` e status codes explícitos em `responses={}` (`400`, `401`, `403`, `404`, `409`, `422`).
- `tags` consistentes nos endpoints — elas viram a estrutura da sidebar.
- Models Pydantic com `Field(..., description=..., examples=[...])` e `json_schema_extra` para exemplos ricos que pré-preenchem o console.
- `title`, `version` e `description` no `FastAPI(...)`.

### B. Decisões de Exposição

- `include_in_schema=False` na rota de docs e em endpoints internos que não devem aparecer.
- Em produção, decida se `/scalar` é público ou protegido — se for interno, coloque atrás de auth/rede privada.
- `show_developer_tools="never"` em produção.
- Agent desativado se você não quer enviar o spec a terceiros.
- Nunca use credenciais reais em `authentication`; só tokens de exemplo.

### C. Reprodutibilidade e Consistência entre Projetos

- Pin da versão do renderer (`scalar_js_url`) e do pacote (`scalar-fastapi`) para builds estáveis.
- Padronize a config numa função utilitária reutilizável entre projetos, variando só título e servidores.
- Escolha uma rota canônica (`/scalar`) e um tema únicos para todos os serviços da organização.
- Se mantiver o `/docs` do Swagger em paralelo, deixe claro qual é a doc oficial para evitar confusão.

### D. Função Utilitária Padrão (Copie entre Serviços)

Centralize a config numa única função; cada serviço só passa título e servidores. É o equivalente, no auto-hospedado, ao "template versionado" dos demais guias.

```python
from scalar_fastapi import get_scalar_api_reference, AgentScalarConfig, Theme


def docs_scalar(app, servers):
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
        theme=Theme.DEFAULT,
        scalar_proxy_url="https://proxy.scalar.com",
        persist_auth=True,
        agent=AgentScalarConfig(disabled=True),
        servers=servers,
        authentication={"preferredSecurityScheme": "HTTPBearer"},
        scalar_js_url="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.0",
    )
```

---

## 🚦 7. Checklist de Lançamento (Definition of Done)

- [ ] **Spec rico**: descrições, exemplos (`json_schema_extra`), tags e `response_model`.
- [ ] **Rota `/scalar`**: configurada com `include_in_schema=False` e `scalar_proxy_url`.
- [ ] **Dual-scheme**: `HTTPBearer` + `OAuth2PasswordBearer` para o console não quebrar com `422`.
- [ ] **Servers**: lista explícita com prod e staging.
- [ ] **Versões fixas**: pinning do pacote (`scalar-fastapi`) e renderer (`scalar_js_url`).
- [ ] **Developer tools e Agent**: ajustados por ambiente (`disabled=True` se não autorizado).
- [ ] **Auth de exemplo**: pré-preenchida sem expor segredos reais.
- [ ] **Decisão de exposição**: rota `/scalar` pública ou sob VPN/Auth de gateway.
- [ ] **Validação E2E**: endpoint testado no console interativo `/scalar` com token válido.

---

## ⚡ 8. Performance & Otimizações para Especificações Massivas (>5MB)

Quando aplicações manipulam especificações OpenAPI muito grandes (como ecossistemas Stripe, Kubernetes ou AWS com milhares de rotas e esquemas complexos), boas práticas de reatividade e renderização devem ser seguidas para evitar alto consumo de heap e travamentos no navegador:

### A. Reatividade Superficial (`shallowRef` e `markRaw`)
- Não envolva esquemas de resposta estáticos ou árvores de nós imutáveis em proxies profundos (`ref()` / `reactive()`).
- Utilize `markRaw()` para objetos de especificação desreferenciados que não sofrem mutações dinâmicas após o carregamento inicial.

### B. Renderização Lazy com `IntersectionObserver`
- O Scalar adota internamente o padrão `Lazy.vue` para componentes de rotas e modelos, montando no DOM apenas os blocos que entram na viewport visível do usuário.
- Para coleções extensas, mantenha a sidebar em modo compacto (`default_open_all_tags=False`) e evite expansão forçada de todos os modelos (`expand_all_model_sections=False`).

### C. Desreferenciação Assíncrona
- Para documentos massivos, priorize o pré-processamento de `$ref` em tempo de build/servidor ou via workers assíncronos, reduzindo a carga síncrona na thread principal da interface.



