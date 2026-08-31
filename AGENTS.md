# AGENTS.md - SIG

Este repositório é o **SIG - Sistema Integrado de Gestão**.

## Antes de qualquer alteração

Carregue e trate como contrato arquitetural:

1. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`
2. `docs/SIG-MANUAL-MESTRE.md`
3. `docs/SIG-GUIA-DE-CONTINUIDADE.md`
4. `SECURITY.md`
5. `app.js`
6. `js/controllership-router.js` quando a alteração envolver Controladoria/FP&A
7. `firestore.rules` quando a alteração ler/gravar dados ou permissões
8. `.github/workflows/js-check.yml` antes de mudar a arquitetura de módulos/testes

Não dependa de memória de conversa para interpretar o produto.

## Regras que não podem ser quebradas silenciosamente

- Hospedagem do frontend é independente da base Firebase.
- Grupo/Empresa/permissões devem ser preservados em toda persistência.
- Conta Sintética nunca recebe lançamento; Analítica é a folha lançável.
- Estatísticas usam o CC técnico `__cc_estatistico__` e não entram no resultado financeiro.
- Balanço usa o CC técnico `__cc_balanco__` e representa posição de fechamento; meses nunca são somados para formar saldo de Balanço.
- Natureza contábil e multiplicadores devem vir do núcleo comum; multiplicador de apresentação nunca regrava o saldo bruto persistido.
- Conta estatística sem `modoPreenchimentoEstatistico` deve ser tratada como `manual` por compatibilidade.
- Budget é anual, usa o exercício global e possui ciclo/versões.
- Forecast combina Realizado fechado + projeção futura.
- CAPEX é investimento separado do resultado operacional; depreciação/amortização é que chega à DRE conforme configuração.
- DRE é relatório e deve refletir a mesma árvore de contas usada por Input/Budget/Forecast.
- Duplicidades não podem ser somadas silenciosamente.
- Fechamentos/bloqueios devem impedir alterações indevidas.
- Ocultar botão não substitui Firestore Rules.
- Nunca colocar segredos no frontend/repositório.

## Processo obrigatório de mudança estrutural

1. Inspecionar a `main` atual.
2. Conferir a branch de desenvolvimento mais recente e possíveis divergências antes de assumir que todo o histórico foi consolidado.
3. Criar checkpoint de recuperação quando a consolidação for ampla.
4. Criar branch de trabalho.
5. Implementar com compatibilidade para dados existentes.
6. Atualizar QA.
7. Validar sintaxe e Chrome headless.
8. Validar `firestore.rules` se houver persistência.
9. Atualizar `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`, `docs/SIG-GUIA-DE-CONTINUIDADE.md` e documentação específica.
10. Promover por fast-forward quando possível.
11. Confirmar QA e deploy da `main`.

Se uma mudança estrutural não atualizar a documentação, considere a entrega incompleta.
