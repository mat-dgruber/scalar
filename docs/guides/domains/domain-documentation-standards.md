# Padrão de IA: Skill de Documentação de Domínio (Domain Documentation Skill)

Esta especificação define a instrução sistemática e os padrões reutilizáveis para a criação de documentações de domínio na plataforma MonFinTrack. Sempre que for solicitado documentar um módulo de negócio ou domínio, os agentes de IA devem invocar esta competência e seguir as diretrizes e modelos estruturados abaixo.

---

## 1. Diretório e Estrutura de Pastas Escalável

Para garantir que a documentação técnica cresça de forma organizada junto com os novos domínios do sistema, os documentos **nunca** devem ser misturados com especificações de IA temporárias ou relatórios soltos. 

Toda documentação de domínio deve residir exclusivamente no seguinte padrão de caminho sob a raiz do projeto:

```
docs/domains/{nome_do_dominio_em_snake_case}/
├── overview.md         # Visão Geral do Domínio
├── business-rules.md   # Regras de Negócio e Matriz de Acesso (RBAC/ABAC)
└── tech-design.md      # Design Técnico, Arquitetura e Contratos de API
```

*(Exemplo para o módulo de Adesão: `docs/domains/adesao/overview.md`)*

---

## 2. Padrões de Conteúdo e Esqueletos

Cada um dos três arquivos possui um escopo e uma audiência específicos. Devem ser escritos em **Português BR (pt-BR)** e seguir rigidamente os esqueletos a seguir:

### 2.1. Modelo: `overview.md` (Visão Geral)
*   **Público-alvo:** Desenvolvedores, analistas de negócios, novos membros da equipe.
*   **Foco:** O que o domínio faz, por que ele existe e como as entidades se relacionam.

```markdown
# Domínio de [Nome do Domínio]: Visão Geral (Overview)

---

## 1. Propósito e Contexto de Negócio
[Descreva em 2-3 parágrafos o papel deste módulo no ecossistema da aplicação, as necessidades que ele resolve e quem são os principais atores interessados.]

---

## 2. Entidades Principais e Relacionamentos
[Insira o diagrama ER em formato ASCII ou textual simplificado demonstrando a cardinalidade das tabelas do banco de dados correspondentes ao domínio.]

### 2.1. [Nome da Entidade 1] (`tabela_no_banco`)
*   **Vínculo Temporal/Territorial:** [Onde se vincula geograficamente (ABAC) ou no tempo?]
*   **Papel:** [O que esta entidade representa?]
*   **Atributos de Destaque:** [Explique chaves estrangeiras cruciais e colunas de metadados como soft delete.]

### 2.2. [Nome da Entidade 2] (`tabela_no_banco`)
...

---

## 3. Fluxo de Trabalho Geral (Workflow)
[Descreva as etapas sequenciais de transição do fluxo do domínio, se houver (ex: criação ➔ envio ➔ aprovação ➔ faturamento).]
```

### 2.2. Modelo: `business-rules.md` (Regras de Negócio)
*   **Público-alvo:** Product Owners, Engenheiros de Software, QAs.
*   **Foco:** Regras de transição de status, restrições geográficas de escrita e matriz de segurança.

```markdown
# Domínio de [Nome do Domínio]: Regras de Negócio (Business Rules)

---

## 1. Ciclo de Vida e Transições de Status
[Explique detalhadamente cada status e o que cada um deles significa.]

### 1.1. Tabela de Transições de Estado
[Mapeie de forma determinística quais transições de status são válidas.]

| Status Atual | Status Destino | Ação de Disparo | Autorizado por | Regra de Validação / Pré-requisito |
| :--- | :--- | :--- | :--- | :--- |
| `status_a` | `status_b` | `acao` | [Ator/Perfil] | [Condição necessária] |

---

## 2. Matriz de Permissões e Acessos (RBAC vs ABAC)
[Explique a sobreposição entre as permissões estáticas do perfil (RBAC) e as restrições jurisdicionais do token (ABAC).]

### 2.1. Ações Disponíveis e Escopos Relacionados
*   `modulo:ver` — [Descrição]
*   `modulo:criar` — [Descrição]

### 2.2. Matriz de Autorização Jurisdicional
[Detalhe as regras geográficas baseadas no nível do token do ator (Associação, União ou CPB).]

| Perfil de Usuário | Escopos Necessários | Filtro Geográfico Aplicado (ABAC) | Ações Permitidas |
| :--- | :--- | :--- | :--- |
| **Administrador CPB (Nacional)** | [Escopos] | Nenhum (Global) | [Ações] |
| **Gestor União (Regional)** | [Escopos] | Restrito à União (`id_uniao`) | [Ações] |
| **Gestor Associação (Local)** | [Escopos] | Restrito à Associação (`id_associacao`) | [Ações] |

---

## 3. Regras de Bloqueio de Escrita e Segurança
*   **Regra 1 (Garantia de Estado Ativo):** [ex: bloqueio de escrita pós-envio]
*   **Regra 2 (Segregação de Funções - SoD):** [ex: União visualiza mas não edita]
```

### 2.3. Modelo: `tech-design.md` (Tech Design)
*   **Público-alvo:** Engenheiros de Software e Arquitetos.
*   **Foco:** Padrões de código, estruturas de classes (ADR-008), políticas (ADR-015/ADR-018), exceptions e endpoints de rotas.

```markdown
# Domínio de [Nome do Domínio]: Design Técnico (Tech Design)

---

## 1. Arquitetura em Camadas e Desacoplamento (ADR-008)
[Descreva como o domínio foi estruturado de forma a desacoplar completamente os casos de uso em classes individuais de responsabilidade única.]

---

## 2. Modelagem de Dados (SQLAlchemy 2.0 Modern Mapped)
[Insira trechos de código exatos do arquivo models.py correspondente ao domínio.]

---

## 3. Fluxo de Autorização e Políticas (`DomainPolicy`)
[Apresente a implementação da classe de políticas herdando de BasePolicy, focando nos filtros inteligentes geográficos e validações.]

---

## 4. Assinatura de Endpoints (API Layer)
[Mapeie de forma clara os endpoints, payloads de entrada/DTOs, tipos de retorno e exceptions disparadas.]

### 4.1. [Breve Descrição do Endpoint]
*   **Caminho:** `MÉTODO /v1/caminho`
*   **Payload (Input):** `DTOClass`
*   **Retorno (Output):** `ResponseDTOClass`
*   **Exceptions Mapeadas (HTTP Status):**
    *   HTTP 400 (`DomainException`): [Causa]
    *   HTTP 403 (`ForbiddenException`): [Causa]
```

---

## 3. Gatilhos de Ativação da Skill (Como Usar)

Sempre que a IA se deparar com as seguintes instruções:
*   *"Documente o domínio X"*
*   *"Crie a especificação de regras de negócio de X"*
*   *"Explique como o módulo X está estruturado"*

A IA deve **automaticamente** ler este arquivo (`docs/ai/prompts/domain-documentation-standards.md`), criar o diretório escalável correspondente em `docs/domains/{dominio}/` e instanciar os três documentos seguindo os padrões, modelos e audiências definidos acima.
