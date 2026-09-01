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
8. `firestore.rules`, `storage.rules`, `firebase.json` e `.firebaserc` quando houver persistência/permissões/backend
9. `.github/workflows/` antes de mudar arquitetura/testes

Não dependa de memória de conversa para interpretar o produto.

## Regras que não podem ser quebradas silenciosamente

- Hospedagem do frontend é independente da base Firebase.
- **GitHub Pages não publica Firestore/Storage Rules.**
- Rule no Git não prova que está ativa no Firebase.
- Grupo/Empresa/permissões devem ser preservados em toda persistência.
- Nova coleção/caminho Storage exige Rule, QA e documentação no mesmo pacote.
- Base contábil crítica indisponível deve operar fail-closed.
- Tela monoempresa não pode usar silenciosamente a primeira empresa de um contexto múltiplo.
- Plano ativo: `js/ctrl-chart-accounts-v6.js`.
- Máscara vigente: `#.##.##.####`.
- Hierarquia: Raiz → `#.##` Sintética N1 → `#.##.##` Sintética N2 → `#.##.##.####` Analítica.
- Sintética nunca recebe lançamento; Analítica é folha lançável.
- `contaPaiId` é o vínculo hierárquico persistido.
- Novas contas usam `versaoMascara: "v6"`.
- Conta com histórico deve ser inativada; exclusão física é só para teste/erro sem referências.
- Antes de delete no Plano, verificar Realizado, Budget, Forecast, detalhes, Premissas, Imobilizado, Centros e bases legadas relacionadas.
- Conta inativa deve poder ser reativada; reativação remove a inativação futura.
- Estatísticas usam `__cc_estatistico__` e não entram no resultado financeiro.
- Balanço usa `__cc_balanco__`, é posição de fechamento e meses não são somados.
- Natureza/multiplicadores vêm de `js/account-mask.js`.
- Multiplicadores nunca regravam saldo bruto persistido.
- Conta redutora é natureza oposta à raiz, não texto `(-)`.
- Conta estatística sem modo explícito é Manual por compatibilidade.
- Budget é anual e versionado.
- Forecast = Realizado fechado + projeção futura.
- Premissas respeitam competência/vigência.
- Imobilizado integrado pode substituir saldo/projeção manual nas combinações mapeadas.
- Fim da depreciação não baixa automaticamente o bem.
- CAPEX ainda não gera desembolso automático no Fluxo de Caixa.

## Mudança de máscara/hierarquia

Qualquer mudança de máscara deve revisar, no mínimo:

- `js/account-mask.js`;
- `js/account-tree.js`;
- Plano ativo;
- Balanço;
- DRE consolidada;
- Input;
- Budget/Forecast;
- Centros de Custo;
- Firestore Rules;
- QA e documentação.

Não alterar apenas a tela de cadastro.

## Exclusão de conta

A Rule de `planoContasGerencial` pode autorizar delete para `fpaPlano()`, mas a segurança funcional exige validação de referências no aplicativo. Não criar atalho que pule essa validação.

`Limpar legado/testes` nunca deve remover conta com histórico/vínculo.

## Módulos legados

Arquivo existir não significa módulo ativo. Não reativar `fpa.js`, versões antigas do Plano ou módulos operacionais sem decisão explícita e atualização do roteador/documentação.

## Release

Antes de promover:

- comparar branch com `main`;
- revisar diff;
- executar Quality Check e Firebase Contract Check;
- atualizar documentação;
- confirmar Rules necessárias;
- evitar force em `main`;
- depois do merge, confirmar Pages e publicar Rules se alteradas.
