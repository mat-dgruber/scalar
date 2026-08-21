# 🎯 ÍNDICE COMPLETO: GUIA E PADRÕES DE TESTES FRONTEND (ANGULAR v20)

## 📋 DOCUMENTAÇÃO INTERCONECTADA

Este é o **índice principal** que norteia a arquitetura, execução, escrita e manutenção de testes para o frontend **MonFinTrack**. A aplicação utiliza **Angular v20** com componentes **Standalone**, **Signals**, **Karma/Jasmine** para testes unitários/componentes e **Playwright** para testes End-to-End (E2E).

---

### **🚀 ESTRUTURA DOS GUIAS DE TESTE FRONTEND**

#### **1. PLANO E ARQUITETURA DE TESTES** 
📄 **[test-modernization-plan.md](./test-modernization-plan.md)**
- **Propósito**: Diretrizes arquiteturais para a pirâmide de testes no frontend Angular.
- **Conteúdo**: Pirâmide de testes (~70% Unitários em Services/Pipes/Utils, ~20% Componentes/Integration com TestBed, ~10% E2E com Playwright), estratégias de mock com `provideHttpClientTesting()`.
- **Uso**: Consulte para organizar componentes, injetores e fluxos de teste.

#### **2. PADRÕES DE ESCRITA**
📄 **[test-writing-standards.md](./test-writing-standards.md)**
- **Propósito**: Convenções para testes de alta qualidade em Angular v20.
- **Conteúdo**: Padrão **AAA** (*Arrange, Act, Assert*), sintaxe Jasmine (`describe`, `it`, `expect`), testes de **Angular Signals** (`signal()`, `computed()`), formulários reativos, standalone components com `TestBed.configureTestingModule` e Page Objects no Playwright.
- **Uso**: Consulte DURANTE a criação de qualquer arquivo `.spec.ts` ou `.e2e.spec.ts`.

#### **3. GUIA DE EXECUÇÃO**
📄 **[test-execution-guide.md](./test-execution-guide.md)**
- **Propósito**: Comandos para rodar a suíte no terminal e em pipelines de CI.
- **Conteúdo**: `npm test` (Karma + ChromeHeadless/Puppeteer), `npm run test:e2e` (Playwright), testes focados (`fdescribe`/`fit`), relatórios de cobertura (Karma Coverage) e auditorias de acessibilidade.
- **Uso**: Consulte no dia a dia do desenvolvimento frontend.

#### **4. TROUBLESHOOTING E RESOLUÇÃO DE PROBLEMAS**
📄 **[troubleshooting.md](./troubleshooting.md)**
- **Propósito**: Guia prático de diagnóstico para problemas comuns em Karma, Jasmine e Playwright.
- **Conteúdo**: Resolver desconexão de navegadores headless, detecção de mudanças assíncronas em Signals (`fixture.detectChanges()`), tratamento de Zone.js/fakeAsync, e timeouts de elementos no Playwright.
- **Uso**: Consulte quando encontrar testes instáveis (*flaky*) ou falhas no Karma/Playwright.

---

## 🎯 WORKFLOW DE DESENVOLVIMENTO DE TESTES FRONTEND

### **FASE 1: PLANEJAMENTO DO TESTE**
1. Identifique a camada do frontend:
   - **Services/Pipes/Store**: Testes unitários puros sem renderização DOM.
   - **Standalone Components**: Testes de integração via `TestBed` com `ComponentFixture`.
   - **E2E Journeys**: Fluxos do usuário em `frontend/e2e/` via Playwright.

### **FASE 2: ESCRITA E MOCKING**
1. Siga o **test-writing-standards.md**.
2. Substitua chamadas HTTP por `HttpTestingController` ou mocks tipados do `AuthService`/`NotificationService`.
3. Valide a reatividade dos Signals com atualizações de estado puras.

### **FASE 3: EXECUÇÃO E COBERTURA**
1. Execute `npm test` para a suíte Karma/Jasmine.
2. Execute `npm run test:e2e` para validar fluxos visuais e de rotas.
3. Garanta meta de cobertura ≥ 80% nos serviços e componentes críticos.

---

## 📊 MÉTRICAS DE QUALIDADE EXIGIDAS

- ✅ **Checagem de Tipos estática**: `npx tsc --noEmit` zerado antes do commit.
- ✅ **Cobertura Geral ≥ 80%** (foco em Services de dados e Formulários reativos).
- ✅ **Isolamento de API**: Testes unitários/componentes nunca realizam chamadas HTTP reais.
- ✅ **Suporte a Temas e Acessibilidade**: Testes e2e cobrem tema escuro e contraste.

---

## 🚀 COMANDOS ESSENCIAIS

```bash
# Entrar no diretório do frontend
cd frontend

# Checagem de tipos TypeScript
npx tsc --noEmit

# Executar testes unitários e de componente (Karma Headless)
npm test

# Executar testes End-to-End com Playwright
npm run test:e2e

# Executar um spec E2E específico
npx playwright test login.e2e.spec.ts
```
