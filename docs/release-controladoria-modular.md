# Release — Controladoria & FP&A

Checklist de promoção para `main`.

**Baseline:** 01/09/2026 — Plano de Contas v6.

> GitHub Pages publica o frontend, mas **não publica** `firestore.rules` nem `storage.rules`. Quando uma versão alterar Rules, o release só termina após publicação Firebase e teste autenticado.

## Antes do merge

- [ ] branch comparada com `main`;
- [ ] `main` não será sobrescrita por force;
- [ ] módulos novos/alterados estão completos;
- [ ] roteador aponta para as versões aprovadas;
- [ ] Plano ativo é `ctrl-chart-accounts-v6.js`;
- [ ] máscara vigente é `#.##.##.####`;
- [ ] Balanço e DRE consolidada entendem N1 e N2;
- [ ] Input/Budget/Forecast continuam operando por Analíticas/IDs;
- [ ] documentação oficial foi atualizada no mesmo pacote;
- [ ] `SECURITY.md` foi revisado;
- [ ] `firestore.rules` contém a Rule necessária para delete seguro do Plano;
- [ ] `firebase.json` e `.firebaserc` continuam coerentes;
- [ ] `SIG Quality Check` está verde no HEAD final;
- [ ] `SIG Firebase Contract Check` está verde no HEAD final;
- [ ] browser smoke executa `abrir()` do Plano v6, Budget e Forecast;
- [ ] nenhuma base crítica é transformada silenciosamente em vazio/zero;
- [ ] telas monoempresa continuam bloqueando múltiplas empresas;
- [ ] exclusão de conta tem validação de referências;
- [ ] histórico real continua sendo preservado por inativação;
- [ ] não existe migração destrutiva implícita de v5 para v6.

## Casos funcionais obrigatórios da v6

Antes da publicação, validar ao menos:

- criar N1 em uma raiz;
- criar N2 dentro de N1;
- criar Analítica dentro de N2;
- criar duas N1 diferentes dentro da mesma raiz;
- recolher/expandir árvore;
- filtrar Ativas / Inativas / Todas;
- inativar conta sem uso;
- confirmar ação **Reativar**;
- reativar;
- tentar excluir conta com referência e confirmar bloqueio;
- excluir conta de teste sem uso somente após Rules publicadas;
- Balanço com N1/N2;
- DRE consolidada com N1/N2.

## Promoção do frontend

Preferir fast-forward quando o histórico permitir.

Não publicar pacote estrutural pela metade. Plano v6, máscara, Balanço, DRE, Rules, QA e documentação são um único pacote de release.

## Publicação Firebase desta versão

Esta versão altera `firestore.rules`:

```text
/planoContasGerencial/{id}
  delete → fpaPlano() && documentoAcessivel(resource.data)
```

Depois do merge, publicar as Rules completas no projeto Firebase `gestao-de-contratos-b266b`.

Com Firebase CLI autenticado:

```bash
firebase deploy --only firestore:rules,storage
```

Ou publicar a Rule completa pelo console do Firestore.

**Não** publicar apenas um trecho isolado da Rule.

## Pós-publicação

- [ ] GitHub Pages concluiu build/deploy do SHA correto;
- [ ] Firestore Rules foram publicadas;
- [ ] Imobilizado continua carregando;
- [ ] Plano v6 abre;
- [ ] criação N1/N2/Analítica funciona;
- [ ] exclusão de teste sem uso funciona;
- [ ] exclusão de histórico é bloqueada pela aplicação;
- [ ] Balanço e DRE exibem a nova hierarquia;
- [ ] Budget/Forecast continuam abrindo;
- [ ] revisar console do navegador para erros.

## Rollback

Se o problema surgir antes de criação de dados reais v6, reverter frontend e Rules em conjunto.

Se já houver contas `versaoMascara: "v6"`, não retornar silenciosamente para versão do Plano que não compreende `#.##.##.####`. Nesse cenário, rollback exige análise de compatibilidade/migração.
