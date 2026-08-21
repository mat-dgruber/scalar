# 🎯 ARQUITETURA E PLANO DE PADRONIZAÇÃO DE TESTES FRONTEND

## 📊 VISÃO GERAL DA ARQUITETURA DE TESTES FRONTEND

O frontend **MonFinTrack** utiliza **Angular v20** baseado em **Standalone Components**, **Signals** e arquitetura reativa moderna. A suíte de testes do frontend é dividida em três níveis complementares:

---

## 🏗️ PIRÂMIDE DE TESTES FRONTEND

```
        / \
       /   \     10% E2E Tests (Playwright — Jornadas de Usuário & Cross-Browser)
      / E2E \
     /-------\   20% Component Integration Tests (TestBed + DOM Events + Forms)
    / Integra \
   /-----------\ 70% Unit Tests (Services, Signals, Guards, Interceptors, Utilities)
  /  Unitários  \
 /---------------\
```

### **1. Testes Unitários (`*.spec.ts`) — ~70%**
- **Escopo**: Services, Signals, Pipes, Directives, Guards de rotas e Interceptors HTTP.
- **Isolamento**: Total. Não renderiza DOM e mocka requisições HTTP via `provideHttpClientTesting()` / `HttpTestingController`.

### **2. Testes de Integração de Componentes (`*.spec.ts`) — ~20%**
- **Escopo**: Standalone Components com formulários reativos (`ReactiveFormsModule`), binding de templates, emissão de eventos (`@Output`) e injeção de dependências via `TestBed`.
- **Renderização**: Utiliza `ComponentFixture` com `fixture.detectChanges()` para validação de layout, PrimeNG UI e interações do usuário.

### **3. Testes End-to-End (`frontend/e2e/*.e2e.spec.ts`) — ~10%**
- **Escopo**: Fluxos transacionais completos de ponta a ponta (Login, Cadastro de Transações, Planejador de Dívidas, Gestão de Contas, Alternância de Tema).
- **Ferramenta**: **Playwright** executando em múltiplos motores de renderização (Chromium, Firefox, WebKit).

---

## 🚀 BLUEPRINT DE IMPLEMENTAÇÃO EM 4 FASES

### **FASE 1: ALINHAMENTO DE TIPAGEM E AMBIENTE**
- [x] Garantir `npx tsc --noEmit` zerado em todo o projeto Angular v20.
- [x] Configurar Karma com `ChromeHeadless` e suporte a Puppeteer.
- [x] Configurar Playwright no `playwright.config.ts`.

### **FASE 2: TESTES UNITÁRIOS DE SERVICES E SIGNALS**
- [x] Testar todos os serviços core (`AuthService`, `NotificationService`, `StarterService`).
- [x] Validar a reatividade de Signals (`signal()`, `computed()`) sob mutações e atualizações de estado.

### **FASE 3: TESTES DE COMPONENTES STANDALONE E FORMULÁRIOS**
- [x] Validar componentes das telas principais (`TransactionFormComponent`, `AccountManager`, `CategoryManager`).
- [x] Testar validações de campos obrigatórios, formatação de moeda (R$) e manipuladores de erros.

### **FASE 4: FLUXOS E2E E INTEGRACAO CI/CD**
- [x] Executar testes E2E via `npm run test:e2e` para validar jornadas críticas antes do deploy em produção no Firebase Hosting / Cloud Run.
