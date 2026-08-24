# Especificação de Design: Reformulação Interna do Share e Integrate (Barra Superior)

**Data**: 2026-08-24  
**Status**: Aprovado  
**Escopo**: `@scalar/api-reference` / Developer Tools  

---

## 1. Visão Geral e Contexto

Na barra superior de ferramentas de desenvolvedor (`DeveloperTools.vue`), o Scalar originalmente disponibiliza dois botões para compartilhamento e publicação em nuvem:
1. **Share**: Faz upload da especificação OpenAPI para os servidores públicos do Scalar (`api.scalar.com` / `registry.scalar.com`) gerando links temporários de 7 dias.
2. **Deploy**: Redireciona o usuário para o Scalar Cloud Pro (`dashboard.scalar.com/register`) para contratação de planos de hospedagem gerenciada.

Em ambientes corporativos com requisitos estritos de segurança, privacidade e soberania de dados (**Zero-Trust / On-Premise**), o envio de especificações e schemas para serviços de terceiros deve ser totalmente desativado.

Este design reformula esses dois botões para operar de forma **100% interna e client-side**:
- **Share**: Transforma-se em um hub de exportação local (Download JSON/YAML, Copiar Spec) e compartilhamento sem backend via fragmento de URL comprimido (`#spec=...`).
- **Integrate & Guias (Substituindo Deploy)**: Transforma-se em um assistente de integração que gera snippets prontos para frameworks internos (Express, Fastify, NestJS, Hono, FastAPI, HTML) e dá acesso direto aos guias de padrões OpenAPI/DX internos.

---

## 2. Arquitetura e Componentes

### 2.1. Novo Componente: `ShareApiReference` & `ApiReferenceToolbarShareLocal`

Localização: `packages/api-reference/src/features/developer-tools/components/`

#### Funcionalidades:
1. **Exportação Imediata**:
   - **Download OpenAPI (JSON)**: Serializa o documento ativo do workspace e dispara o download do arquivo `openapi.json`.
   - **Download OpenAPI (YAML)**: Converte a especificação JSON para YAML e dispara o download do arquivo `openapi.yaml`.
   - **Copiar Especificação**: Copia o conteúdo JSON completo para a área de transferência com feedback visual (Toast).
2. **Link de Prévia Client-Side (`#spec=...`)**:
   - Comprime o schema OpenAPI utilizando algoritmo de compressão (Deflate / `lz-string`) para reduzir o tamanho em ~80-90%.
   - Converte para string Base64 URL-safe.
   - Gera a URL completa `${window.location.origin}${window.location.pathname}#spec=${compressedSpec}`.
   - Fornece campo de texto com botão de cópia rápida.
3. **Leitor de Hash no Carregamento**:
   - No bootstrap do `@scalar/api-reference`, verifica a presença do parâmetro `#spec=` ou `?spec=`.
   - Se presente, descompacta a especificação e a injeta diretamente no `WorkspaceStore`.

### 2.2. Novo Componente: `IntegrateApiReference` & `ApiReferenceToolbarIntegrate`

Substitui o antigo `DeployApiReference.vue`.

#### Funcionalidades:
1. **Gerador de Snippets de Integração**:
   - Seletor de frameworks com opções:
     - **Node.js (Express)**: `@scalar/express-api-reference`
     - **Node.js (Fastify)**: `@scalar/fastify-api-reference`
     - **Node.js (NestJS)**: `@scalar/nestjs-api-reference`
     - **Node.js (Hono)**: `@scalar/hono-api-reference`
     - **Python (FastAPI)**: Integração com rota Scalar via CDN/HTML
     - **HTML Standalone / CDN**: Template HTML minimalista autônomo
   - Renderização com realce de sintaxe via `ScalarCodeBlock` e botão de copiar código.
2. **Aba de Guias & Boas Práticas Internas**:
   - Atalhos e visualização dos guias do repositório:
     - **Guia Padrão OpenAPI & DX** (`docs/guides/guia-padrao-scalar-openapi-dx.md`)
     - **Guia de Arquitetura do Fork** (`docs/guides/guia-arquitetura-e-manutencao-scalar-fork.md`)
   - Links e resumos para acelerar a padronização dos times de desenvolvimento.

### 2.3. Atualização do `DeveloperTools.vue`

- Substituir a importação de `DeployApiReference` por `IntegrateApiReference`.
- Manter a barra limpa, organizada e estritamente local:
  - `ApiReferenceToolbarTitle`
  - `ModifyConfiguration` (Configurações de Tema e Layout)
  - `ShareApiReference` (Exportação e Link Hash)
  - `IntegrateApiReference` (Snippets e Guias)
- Eliminar o helper `uploadTempDocument.ts` ou desacoplá-lo de chamadas externas.

---

## 3. Internacionalização e Localização (i18n)

Atualizar os dicionários de tradução (`locales/pt.ts`, `locales/en.ts`, etc.) em `packages/api-reference/src/features/localization/locales/`:

- `developerTools.shareTitle`: "Exportar e Compartilhar" / "Export & Share"
- `developerTools.shareDescription`: "Exporte a especificação OpenAPI localmente ou gere um link de prévia offline."
- `developerTools.downloadJson`: "Baixar JSON"
- `developerTools.downloadYaml`: "Baixar YAML"
- `developerTools.copySpec`: "Copiar Especificação"
- `developerTools.previewLink`: "Link de Prévia Offline"
- `developerTools.integrate`: "Integrar & Guias" / "Integrate & Guides"
- `developerTools.integrateTitle`: "Como Integrar o Scalar no seu Projeto"
- `developerTools.integrateDescription`: "Escolha seu framework para copiar o código de inicialização e consulte nossos guias internos."

---

## 4. Fluxo de Dados e Segurança

```
[Desenvolvedor Local]
         │
         ├───> [Share] ───> Exportação Direta (Download / Clipboard) ───> 100% Client-Side
         │              └──> Compressão Deflate -> URL Hash (#spec=) ───> Sem rede / Zero-Trust
         │
         └───> [Integrate] ──> Snippets por Framework (Express, Nest, etc.)
                            └──> Leitura dos Guias OpenAPI DX Internos
```

- **Zero Chamadas Externas**: Nenhuma requisição é feita para `api.scalar.com`, `registry.scalar.com` ou `dashboard.scalar.com`.
- **Compatibilidade**: Funciona perfeitamente em ambientes sem internet (Air-Gapped) ou atrás de proxies corporativos estritos.

---

## 5. Plano de Testes e Validação

1. **Testes Unitários (Vitest)**:
   - Testar utilitário de compressão/descompressão de spec (`compressSpec` / `decompressSpec`).
   - Validar exportação de JSON e conversão de YAML.
2. **Verificação de Tipos**:
   - `corepack pnpm --filter @scalar/api-reference types:check`
3. **Verificação Visual e de Componentes**:
   - Testar botões de download e cópia de link na barra superior no playground do `@scalar/api-reference`.
   - Testar abertura de link com `#spec=` no navegador verificando a correta renderização do documento.
