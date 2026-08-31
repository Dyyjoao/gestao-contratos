# AGENTS.md - SIG

Este repositório é o **SIG - Sistema Integrado de Gestão**.

## Antes de qualquer alteração

Carregue e trate como contrato arquitetural:

1. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`
2. `docs/SIG-MANUAL-MESTRE.md`
3. `app.js`
4. `js/controllership-router.js` quando a alteração envolver Controladoria/FP&A
5. `firestore.rules` quando a alteração ler/gravar dados ou permissões
6. `.github/workflows/js-check.yml` antes de mudar a arquitetura de módulos/testes

Não dependa de memória de conversa para interpretar o produto.

## Regras que não podem ser quebradas silenciosamente

- Hospedagem do frontend é independente da base Firebase.
- Grupo/Empresa/permissões devem ser preservados em toda persistência.
- Conta Sintética nunca recebe lançamento; Analítica é a folha lançável.
- Estatísticas usam o CC técnico `__cc_estatistico__` e não entram no resultado financeiro.
- Conta estatística sem `modoPreenchimentoEstatistico` deve ser tratada como `manual` por compatibilidade.
- Budget é anual, usa o exercício global e possui ciclo/versões.
- Forecast combina Realizado fechado + projeção futura.
- DRE é relatório e deve refletir a mesma árvore de contas usada por Input/Budget/Forecast.
- Duplicidades não podem ser somadas silenciosamente.
- Fechamentos/bloqueios devem impedir alterações indevidas.
- Ocultar botão não substitui Firestore Rules.
- Nunca colocar segredos no frontend/repositório.

## Processo obrigatório de mudança estrutural

1. Inspecionar a `main` atual.
2. Criar branch.
3. Implementar com compatibilidade para dados existentes.
4. Atualizar QA.
5. Validar sintaxe e Chrome headless.
6. Validar `firestore.rules` se houver persistência.
7. Atualizar `docs/SIG-DOSSIE-DE-CONTINUIDADE.md` e documentação específica.
8. Promover por fast-forward quando possível.
9. Confirmar QA e deploy da `main`.

Se uma mudança estrutural não atualizar a documentação, considere a entrega incompleta.
