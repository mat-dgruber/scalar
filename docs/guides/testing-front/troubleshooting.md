# 🔧 TROUBLESHOOTING E RESOLUÇÃO DE PROBLEMAS EM TESTES FRONTEND

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

---

### **1. Erro `ChromeHeadless failed to connect` ou Desconexão do Karma**

#### **Sintoma**:
O runner Karma falha ao iniciar com `Disconnected (0 times) re-connected` ou erro de permissão no Chrome.

#### **Causa**:
Falta das flags `--no-sandbox` e `--disable-gpu` no ChromeHeadless em ambientes CI/Linux ou contêineres Docker.

#### **Solução**:
Configure a custom launcher no `karma.conf.js`:

```javascript
// karma.conf.js
browsers: ['ChromeHeadlessCustom'],
customLaunchers: {
  ChromeHeadlessCustom: {
    base: 'ChromeHeadless',
    flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  }
}
```

---

### **2. Mudanças Reativas em Signals não Refletidas no DOM do Teste**

#### **Sintoma**:
O valor de um `signal()` foi alterado no teste, mas o elemento HTML recuperado via `fixture.nativeElement` não atualizou.

#### **Causa**:
A detecção de mudanças do Angular precisa ser notificada explicitamente durante testes de componentes em Jasmine.

#### **Solução**:
Invoque `fixture.detectChanges()` após modificar o valor do Signal:

```typescript
// Atualize o Signal
component.amountSignal.set(250.0);

// Force a atualização do DOM do Angular
fixture.detectChanges();

// Assert no template renderizado
const displayElement = fixture.nativeElement.querySelector('.amount-display');
expect(displayElement.textContent).toContain('250,00');
```

---

### **3. Requisições HTTP Pendentes no `HttpTestingController`**

#### **Sintoma**:
Erro `Expected no open requests, found 1 request(s)` no bloco `afterEach`.

#### **Causa**:
Um serviço ou componente realizou uma chamada HTTP que não foi interceptada e respondida com `req.flush()` ou `req.error()`.

#### **Solução**:
Garanta que toda requisição disparada pelo componente tenha sua correspondente resposta no teste:

```typescript
const req = httpTestingController.expectOne('/api/categories');
req.flush([{ id: '1', name: 'Alimentação' }]); // Resolve a requisição pendente
```

---

### **4. Erros com Componentes Standalone no `TestBed`**

#### **Sintoma**:
`NG0204: Can't bind to 'ngModel' since it isn't a known property of 'input'`.

#### **Causa**:
Falta de importação de módulos ou componentes Standalone necessários no `imports` do `TestBed.configureTestingModule`.

#### **Solução**:
Adicione os módulos e componentes dependentes no array `imports`:

```typescript
await TestBed.configureTestingModule({
  imports: [
    TransactionFormComponent, // O próprio standalone component
    FormsModule,
    ReactiveFormsModule
  ]
}).compileComponents();
```

---

### **5. Timeouts no Playwright (`TimeoutExceededError`)**

#### **Sintoma**:
O Playwright falha aguardando um elemento da página aparecer com timeout de 30s.

#### **Causa**:
Aguardando animações CSS, requisições lentas de backend ou seletor CSS/Aria incorreto.

#### **Solução**:
Utilize seletores com visibilidade garantida ou aguarde requisições de rede explicitamente:

```typescript
// Aguarde a resposta da API antes de verificar o resultado no DOM
await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/api/auth') && resp.status() === 200),
  page.click('button[type="submit"]')
]);

await expect(page.locator('.user-avatar')).toBeVisible();
```
