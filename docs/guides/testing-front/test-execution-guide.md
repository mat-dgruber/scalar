# 📋 GUIA DE EXECUÇÃO DE TESTES FRONTEND (ANGULAR v20)

## 🚀 COMANDOS ESSENCIAIS DE EXECUÇÃO

Todas as rotinas de teste no frontend devem ser executadas dentro do diretório `frontend/`:

```bash
cd frontend
```

---

### **1. Checagem Estática de Tipos (TypeScript)**

Antes de rodar a suíte de testes unitários ou E2E, execute a verificação estática de tipos para garantir zero erros de compilação:

```bash
npx tsc --noEmit
```

---

### **2. Testes Unitários e de Componente (Karma + Jasmine)**

Os testes unitários utilizam Karma como runner e Jasmine como framework de asserções em modo `ChromeHeadless` ou Puppeteer:

```bash
# Executar todos os testes em modo headless (uma única execução / CI)
npm test

# Executar watch mode durante o desenvolvimento
npx ng test --watch=true

# Executar gerando relatório de cobertura de código
npm run test -- --code-coverage
```

#### **Execução Focada (Single Spec / Test)**
No Jasmine, utilize `fdescribe` ou `fit` no arquivo `.spec.ts` para focar em uma única suíte ou teste específico sem rodar toda a aplicação:

```typescript
// Executa somente esta suíte
fdescribe('TransactionFormComponent', () => { ... });

// Executa somente este teste específico
fit('deve validar o valor mínimo da transação', () => { ... });
```

---

### **3. Testes End-to-End (Playwright)**

Os testes E2E validam jornadas visuais, roteamento, autenticação e responsividade em múltiplos navegadores (Chromium, Firefox, WebKit):

```bash
# Executar todos os testes E2E (inicia o ng serve automaticamente)
npm run test:e2e

# Executar um espec específico do Playwright
npx playwright test login.e2e.spec.ts

# Executar com interface gráfica do Playwright (UI Mode)
npx playwright test --ui

# Executar em modo headless com relatórios HTML
npx playwright test --reporter=html
npx playwright show-report
```

---

## 🎯 METAS DE COBERTURA E QUALIDADE

### **Targets de Cobertura (Coverage Targets)**
- **Services de Negócio e HTTP**: ≥ 85%
- **Standalone Components & Formulários**: ≥ 80%
- **Pipes, Directives e Utilities**: ≥ 90%
- **Overall Frontend**: ≥ 80%

### **Verificação de Relatórios de Cobertura**
Após executar `npm run test -- --code-coverage`, o relatório interativo é gerado em `frontend/coverage/index.html`:

```bash
open coverage/index.html
```

---

## ⚡ PERFORMANCE E ORGANIZAÇÃO DA SUÍTE

1. **Sem Chamadas Backend Reais em Karma**: Todos os testes unitários utilizam `provideHttpClientTesting()` ou spies do Jasmine.
2. **Cleanup de Testes**: Garanta que o `HttpTestingController.verify()` seja invocado no `afterEach` de cada teste HTTP.
3. **Mocks Leves**: Utilize mocks de objetos planos para representação de modelos de transações, contas e categorias.
