# AGENTS.md — SIG

Este repositório é o **SIG — Sistema Integrado de Gestão**.

## Antes de qualquer alteração

Trate como contrato arquitetural:

1. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`
2. `docs/SIG-MANUAL-MESTRE.md`
3. `docs/SIG-GUIA-DE-CONTINUIDADE.md`
4. `SECURITY.md`
5. `app.js`
6. `js/controllership-router.js` quando envolver Controladoria/FP&A
7. `firestore.rules` quando houver leitura/gravação/permissões
8. `.github/workflows/js-check.yml` antes de mudar arquitetura/testes

Não dependa de memória de conversa para interpretar o produto.

## Regras que não podem ser quebradas silenciosamente

- Hospedagem do frontend é independente da base Firebase.
- Grupo/Empresa/permissões devem ser preservados em toda persistência.
- Tela monoempresa não pode usar silenciosamente a primeira empresa de um contexto múltiplo.
- Plano vigente: raiz → `#.##` Sintética → `#.##.####` Analítica.
- Sintética nunca recebe lançamento; Analítica é folha lançável.
- Não recriar níveis Sintéticos arbitrários fora da máscara vigente.
- Estatísticas usam `__cc_estatistico__` e não entram no resultado financeiro.
- Balanço usa `__cc_balanco__`, representa posição de fechamento e meses não são somados.
- Natureza/multiplicadores vêm de `js/account-mask.js`.
- Multiplicador de apresentação/resultado nunca regrava saldo bruto persistido.
- Conta redutora é definida por natureza oposta à raiz, não pelo texto `(-)`.
- Conta estatística sem modo explícito deve ser tratada como Manual por compatibilidade.
- Budget é anual, versionado e usa A-1 do exercício selecionado.
- Forecast = Realizado fechado + projeção futura.
- Premissas respeitam vigência mês a mês; específica do CC vence corporativa.
- CAPEX é investimento; depreciação/amortização chega à DRE conforme configuração.
- Imobilizado automático não pode duplicar lançamento/projeção manual equivalente.
- DRE consolidada multiempresa deve ser semanticamente compatível por código, não por ID interno de conta.
- Dashboard/Prestação devem usar interpretação financeira comum; Ativo/Passivo/Estatística nunca viram OPEX.
- Fluxo de Caixa é monoempresa.
- Prestação de Contas é monoempresa.
- Duplicidades nunca são somadas silenciosamente.
- Fechamentos/bloqueios protegem lançamentos.
- Ocultar botão não substitui Firestore Rules.
- Nunca colocar segredos no frontend/repositório.

## Código legado

Versões antigas de módulos podem permanecer no repositório.

- não reative versão antiga por conveniência;
- a rota atual é a fonte de verdade;
- não apague arquivo antigo sem confirmar imports, migrações e compatibilidade;
- elimine “duas verdades” de execução antes de remover histórico físico.

## Processo obrigatório de mudança estrutural

1. inspecionar `main` e branch de trabalho;
2. conferir rota ativa e dependências;
3. criar checkpoint quando a consolidação for ampla;
4. implementar com compatibilidade de dados;
5. atualizar QA;
6. validar sintaxe/imports/Chrome headless;
7. validar `firestore.rules` se houver persistência;
8. atualizar Dossiê/Guia e documentação específica;
9. comparar branch com `main`;
10. só então promover;
11. confirmar QA e deploy da `main`.

## QA mínimo contábil/gerencial

Antes de release estrutural da Controladoria, validar pelo menos:

- Ativo e contra-Ativo;
- Passivo e contra-Passivo;
- Receita e Despesa;
- Estatística neutra;
- saldo bruto preservado;
- Balanço como posição;
- consolidação por código;
- vigência de contas e premissas;
- Budget A-1;
- Forecast fechado + futuro;
- Imobilizado/depreciação automática;
- Dashboard/Prestação sem Balanço/Estatística em OPEX;
- bloqueio multiempresa em Fluxo de Caixa e Prestação.

Se uma mudança estrutural não atualizar a documentação, considere a entrega incompleta.