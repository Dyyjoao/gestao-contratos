# Release — Controladoria & FP&A

Checklist de promoção para `main`.

**Baseline:** 01/09/2026 — Plano de Contas v6 + Consórcios v1.

> GitHub Pages publica o frontend, mas **não publica** `firestore.rules` nem `storage.rules`. Quando uma versão alterar Rules, o release só termina após publicação Firebase e teste autenticado.

## Antes do merge

- [ ] branch comparada com `main`;
- [ ] `main` não será sobrescrita por force;
- [ ] módulos novos/alterados estão completos;
- [ ] roteador aponta para as versões aprovadas;
- [ ] Plano ativo é `ctrl-chart-accounts-v6.js`;
- [ ] Consórcios ativo é `ctrl-consorcios-v1.js`;
- [ ] máscara vigente é `#.##.##.####`;
- [ ] Balanço e DRE consolidada entendem N1 e N2;
- [ ] Input/Budget/Forecast continuam operando por Analíticas/IDs;
- [ ] Consórcios permanece independente de DRE/Balanço/Caixa/Planejamento nesta v1;
- [ ] documentação oficial foi atualizada no mesmo pacote;
- [ ] `SECURITY.md` continua coerente;
- [ ] `firestore.rules` contém a Rule do Plano e da coleção `consorcios`;
- [ ] `firebase.json` e `.firebaserc` continuam coerentes;
- [ ] `SIG Quality Check` está verde no HEAD final;
- [ ] `SIG Firebase Contract Check` está verde no HEAD final;
- [ ] `SIG Permissions Contract Check` está verde no HEAD final;
- [ ] `SIG Consorcios Contract Check` está verde no HEAD final;
- [ ] browser smoke abre módulos críticos e Consórcios v1;
- [ ] nenhuma base crítica é transformada silenciosamente em vazio/zero;
- [ ] telas monoempresa continuam bloqueando múltiplas empresas;
- [ ] exclusão de conta tem validação de referências;
- [ ] histórico real continua sendo preservado;
- [ ] não existe migração destrutiva implícita de v5 para v6.

## Casos funcionais obrigatórios do Plano v6

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

## Casos funcionais obrigatórios de Consórcios v1

- perfil com **Visualizar consórcios** acessa carteira sem editar;
- perfil com **Gerir consórcios** cria/edita ficha;
- cadastro novo exige uma única empresa;
- visão de carteira aceita múltiplas empresas selecionadas;
- carta atual/reajustada passa a ser a base do cálculo;
- taxa de administração + reserva + seguro/outros formam a taxa do consórcio;
- juros/encargos permanecem separados;
- parcela média e parcela atual aparecem separadamente;
- valor pago acumulado reduz o saldo teórico;
- contemplação registra data/modalidade/lance;
- status Encerrado/Cancelado preserva a ficha;
- nenhum lançamento é criado em DRE, Balanço, Caixa, Budget ou Forecast.

## Promoção do frontend

Preferir fast-forward quando o histórico permitir.

Não publicar pacote estrutural pela metade. Código, permissões, Rules, QA e documentação são um único pacote de release.

## Publicação Firebase desta versão

A baseline contém, entre outras, estas mudanças de Rules:

```text
/planoContasGerencial/{id}
  delete → fpaPlano() && documentoAcessivel(resource.data)

/consorcios/{id}
  read → consorciosVisualizar() && documentoAcessivel(resource.data)
  create/update → consorciosEditar() + documento acessível
  delete → bloqueado
```

Depois do merge, publicar as Rules completas no projeto Firebase `gestao-de-contratos-b266b`.

Com Firebase CLI autenticado:

```bash
firebase deploy --only firestore:rules,storage
```

Ou publicar a Rule completa pelo console do Firestore.

**Não publicar apenas um trecho isolado da Rule.**

## Pós-publicação

- [ ] GitHub Pages concluiu build/deploy do SHA correto;
- [ ] Firestore Rules foram publicadas;
- [ ] Imobilizado continua carregando;
- [ ] Plano v6 abre;
- [ ] criação N1/N2/Analítica funciona;
- [ ] exclusão de teste sem uso funciona;
- [ ] exclusão de histórico é bloqueada pela aplicação;
- [ ] Balanço e DRE exibem a hierarquia atual;
- [ ] Budget/Forecast continuam abrindo;
- [ ] Consórcios abre para perfil autorizado;
- [ ] cadastro/edição de Consórcios funciona após Rules publicadas;
- [ ] perfil somente consulta não consegue gravar Consórcios;
- [ ] revisar console do navegador para erros.

## Rollback

Se o problema surgir antes de criação de dados reais novos, reverter frontend e Rules em conjunto.

Se já houver contas v6 ou fichas de Consórcios persistidas, não retornar silenciosamente para frontend que não compreende os formatos atuais. Nesse cenário, rollback exige análise de compatibilidade/migração.