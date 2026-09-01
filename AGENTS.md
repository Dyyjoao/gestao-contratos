# AGENTS.md — SIG

Este repositório é o **SIG — Sistema Integrado de Gestão**.

## Antes de qualquer alteração

Trate como contrato arquitetural:

1. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`
2. `docs/SIG-MANUAL-MESTRE.md`
3. `docs/SIG-GUIA-DE-CONTINUIDADE.md`
4. `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`
5. `SECURITY.md`
6. `app.js`
7. `js/controllership-router.js` quando envolver Controladoria/FP&A
8. `firestore.rules`, `storage.rules`, `firebase.json` e `.firebaserc` quando houver leitura/gravação/permissões/deploy de backend
9. `.github/workflows/` antes de mudar arquitetura/testes

Não dependa de memória de conversa para interpretar o produto.

## Regras que não podem ser quebradas silenciosamente

- Hospedagem do frontend é independente da base Firebase.
- **GitHub Pages não publica Firestore/Storage Rules.** Rule alterada exige deploy Firebase separado.
- Rule existente no Git não prova que ela está ativa no Firebase.
- Grupo/Empresa/permissões devem ser preservados em toda persistência.
- Nova coleção/subcoleção/caminho Storage exige Rule, QA, documentação e procedimento de deploy no mesmo pacote.
- Base contábil crítica indisponível não pode ser tratada como lista vazia/zero; comportamento deve ser fail-closed.
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
- `imobilizados` é dependência crítica para Balanço, Input patrimonial, Budget, Forecast, DRE projetada e validação de inativação do Plano.
- Fim da vida útil encerra depreciação, mas não baixa automaticamente o bem.
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
3. identificar coleções/Storage e permissões afetadas;
4. criar checkpoint quando a consolidação for ampla;
5. implementar com compatibilidade de dados;
6. atualizar Rules quando necessário;
7. atualizar QA;
8. validar sintaxe/imports/Chrome headless;
9. validar fail-closed de bases críticas;
10. atualizar Dossiê/Guia e documentação específica;
11. comparar branch com `main`;
12. só então promover;
13. confirmar QA e deploy da `main`;
14. se Rules mudaram, realizar deploy Firebase separado e teste autenticado.

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
- abertura real de Budget/Forecast no browser;
- Imobilizado/depreciação automática;
- erro de `imobilizados` bloqueando cálculo automático e inativação de conta;
- Dashboard/Prestação sem Balanço/Estatística em OPEX;
- bloqueio multiempresa em Fluxo de Caixa e Prestação;
- contrato Firebase (`firebase.json`, `.firebaserc`, Rules) coerente.

Se uma mudança estrutural não atualizar documentação, QA e Rules/deploy aplicáveis, considere a entrega incompleta.
