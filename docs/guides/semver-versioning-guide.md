Para definir a versão de um software, use um esquema de versionamento claro, de preferência SemVer (Versionamento Semântico), que é o mais usado hoje.

Conceito básico

No SemVer, a versão é escrita como:

MAJOR.MINOR.PATCH

Por exemplo: 2.4.7.

- MAJOR (2): muda quando você faz alterações incompatíveis com versões anteriores (breaking changes).

- MINOR (4): muda quando você adiciona funcionalidades de forma compatível (sem quebrar nada existente).

- PATCH (7): muda quando você faz correções de bugs e pequenas melhorias internas, sem mudar o comportamento esperado da API.

Quando mudar cada número

- Aumente o PATCH:

▫ Correções de bug.

▫ Ajustes de layout, pequenos refactors que não mudam a API.

▫ Melhorias de performance sem mudar o contrato da interface.

- Aumente o MINOR e zere o PATCH:

▫ Nova funcionalidade que não quebra nada existente.

▫ Novos endpoints em uma API.

▫ Novos componentes/páginas que só adicionam coisas.Exemplo: ‎⁠1.3.5⁠ → adicionou um recurso sem quebra → ‎⁠1.4.0⁠.

- Aumente o MAJOR e zere MINOR e PATCH:

▫ Remoção ou mudança de comportamento de endpoints existentes.

▫ Mudança de contrato de funções/métodos públicos.

▫ Mudanças grandes em regras de negócio que exigem adaptação de quem usa.Exemplo: ‎⁠2.7.3⁠ → mudança incompatível → ‎⁠3.0.0⁠.

Rótulos adicionais

Você ainda pode usar sufixos para indicar estágio de release:

- ‎⁠1.0.0-alpha.1⁠ (versão bem inicial, instável)

- ‎⁠1.0.0-beta.2⁠ (mais estável, mas ainda testes)

- ‎⁠1.0.0-rc.1⁠ (release candidate, quase versão final)

Esses rótulos ajudam em pipelines de CI/CD e em testes com usuários internos.

Boas práticas na prática (projeto real)

Para um sistema web (por exemplo, Angular + API):

- Defina pontos de versão ligados a marcos de negócio:

▫ v1.0.0: MVP publicado.

▫ v1.1.0: adicionou módulo de relatórios.

▫ v2.0.0: reescreveu regras de estoque de forma incompatível.

- Tenha um CHANGELOG:

▫ Anote, para cada versão: o que foi adicionado, alterado, removido e corrigido.

▫ Isso ajuda muito equipe, QA e usuários internos.

- Use tags no Git:

▫ Ex.: ‎⁠git tag v1.3.0⁠ e ‎⁠git push origin v1.3.0⁠.

▫ Cada deploy “oficial” aponta para uma tag de versão.

Se você quiser, posso te sugerir uma convenção de versionamento específica para um projeto seu (por exemplo, MonFinTrack ou o sistema da CPB) com exemplos concretos de versões e mudanças típicas.
