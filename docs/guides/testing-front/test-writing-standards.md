# 📐 PADRÕES DE ESCRITA DE TESTES FRONTEND (ANGULAR v20)

## 🎯 ESTRUTURA OBRIGATÓRIA (AAA Pattern & Jasmine)

Todo teste frontend deve ser estruturado com o padrão **Arrange, Act, Assert** utilizando a sintaxe do **Jasmine/Karma**:

```typescript
describe('TransactionService', () => {
  let service: TransactionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TransactionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TransactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Garante que nenhuma requisição ficou pendente
  });

  it('deve buscar transações com sucesso', () => {
    // Arrange
    const mockTransactions = [{ id: '1', description: 'Mercado', amount: 150.0 }];

    // Act
    service.getTransactions().subscribe(transactions => {
      // Assert
      expect(transactions.length).toBe(1);
      expect(transactions[0].description).toBe('Mercado');
    });

    const req = httpMock.expectOne('/api/transactions');
    expect(req.request.method).toBe('GET');
    req.flush(mockTransactions);
  });
});
```

---

## 📝 CONVENÇÕES DE NOMENCLATURA E ESTRUTURA

### **1. Suítes de Teste (`describe`)**
- `describe('NomeDoComponenteOuService', () => { ... })`
- Sub-blocos organizados por método ou estado: `describe('#saveTransaction', () => { ... })`

### **2. Casos de Teste (`it`)**
- Em Português BR, descrevendo o comportamento esperado:
  - `it('deve calcular o saldo total corretamente ao adicionar receita', () => { ... })`
  - `it('deve exibir mensagem de erro quando o formulário for inválido', () => { ... })`

### **3. Localização dos Arquivos**
- **Testes Unitários/Componentes**: Arquivos `.spec.ts` junto do componente ou serviço sob teste (ex: `transaction-form.spec.ts`).
- **Testes E2E (Playwright)**: Arquivos `.e2e.spec.ts` na raiz de e2e ou em `frontend/e2e/`.

---

## ⚡ TESTANDO ANGULAR SIGNALS (ANGULAR v20)

Angular v20 utiliza **Signals** (`signal()`, `computed()`, `effect()`) para reatividade. Teste atualizações diretas de valor e computados sem complexidade RxJS:

```typescript
describe('DashboardState', () => {
  it('deve recomputar o balanço quando a receita e despesa mudarem', () => {
    // Arrange
    const income = signal(1000);
    const expense = signal(400);
    const balance = computed(() => income() - expense());

    // Assert inicial
    expect(balance()).toBe(600);

    // Act — atualização de signal
    income.set(1500);

    // Assert reativo
    expect(balance()).toBe(1100);
  });
});
```

---

## 🧩 TESTANDO COMPONENTES STANDALONE

Em Angular v20, todos os componentes são `standalone: true`. Configure o `TestBed` importando o próprio componente no array `imports`:

```typescript
describe('NotificationBellComponent', () => {
  let component: NotificationBellComponent;
  let fixture: ComponentFixture<NotificationBellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent], // Standalone component no imports
      providers: [
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['unreadCount']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente com sucesso', () => {
    expect(component).toBeTruthy();
  });
});
```

---

## 🎭 MOCKS E SPYS DO JASMINE

### **1. Criando Spies para Serviços**
```typescript
const authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'logout'], {
  isAuthResolved$: of(true)
});
authServiceSpy.login.and.returnValue(of({ token: 'jwt-token-fake' }));
```

### **2. Verificações Comuns (Asserts)**
```typescript
expect(service.login).toHaveBeenCalledWith('user@email.com', 'senha123');
expect(component.form.valid).toBeFalse();
expect(fixture.nativeElement.querySelector('.badge').textContent).toContain('3');
```

---

## 🎭 TESTES E2E COM PLAYWRIGHT

Para testes End-to-End no Playwright, utilize o padrão **Page Object Model (POM)**:

```typescript
// frontend/e2e/login.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Fluxo de Autenticação', () => {
  test('deve realizar login e redirecionar para o dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'usuario@monfintrack.com.br');
    await page.fill('input[type="password"]', 'SenhaSegura123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/app/dashboard');
    await expect(page.locator('h1')).toContainText('Visão Geral');
  });
});
```
