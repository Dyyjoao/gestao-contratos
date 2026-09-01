# SIG — Guia Operacional de Continuidade

**Finalidade:** retomar o SIG em outra conversa, IA, equipe, computador, repositório ou hospedagem sem depender de memória informal.  
**Data-base:** 01/09/2026 — Plano de Contas v6 + Balanço gerencial + Consórcios v1.

---

## 1. Ordem de leitura

1. `AGENTS.md`;
2. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`;
3. `docs/SIG-MANUAL-MESTRE.md`;
4. este Guia;
5. `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`;
6. `SECURITY.md`;
7. `app.js`;
8. `js/controllership-router.js`;
9. `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc`;
10. `.github/workflows/`.

Na Controladoria, nunca deduzir o módulo ativo pelo nome do arquivo: conferir o roteador.

---

## 2. Estado estrutural atual

Plano ativo: `js/ctrl-chart-accounts-v6.js`.

Máscara: `#.##.##.####`.

Hierarquia: `Raiz → Sintética N1 → Sintética N2 → Analítica`.

O Plano oferece árvore expansível, filtro Ativas/Inativas/Todas, inativação, reativação, exclusão segura de teste/legado e cópia de estrutura v6.

Balanço atual possui visão mensal com fechamento final do trimestre/ano e comparativo anual Atual x Last Year.

Consórcios ativo: `js/ctrl-consorcios-v1.js`. A matemática fica em `js/consortium-calculations.js`. Persistência: coleção `consorcios`.

---

## 3. Como retomar desenvolvimento

1. confirmar branch e HEAD;
2. comparar com `main`;
3. ler o roteador e os módulos afetados;
4. buscar consumidores indiretos antes de alterar formatos ou regras;
5. atualizar documentação no mesmo pacote;
6. rodar QA;
7. promover somente o HEAD validado.

Mudança de Plano exige revisar máscara, árvore, Balanço, DRE, Input, Budget/Forecast, Centros, Rules e QA.

Mudança de Consórcios exige revisar:

- `js/ctrl-consorcios-v1.js`;
- `js/consortium-calculations.js`;
- `js/controllership-router.js`;
- `js/profiles.js`;
- `firestore.rules`;
- `SIG Consorcios Contract Check`;
- documentação.

**Não integrar Consórcios a DRE, Balanço, Caixa, Budget, Forecast ou Imobilizado sem decisão arquitetural explícita.** A v1 é independente.

---

## 4. Histórico

Plano de Contas: conta que teve vida real deve ser inativada; exclusão é apenas para teste/erro sem referência.

Consórcios: não existe exclusão física na v1. Usar `Encerrado` para plano concluído e `Cancelado` para plano cancelado.

---

## 5. Firebase

GitHub Pages publica frontend, mas não publica `firestore.rules` nem `storage.rules`.

A baseline atual contém Rules para:

- `imobilizados`;
- delete seguro de `planoContasGerencial`;
- `consorcios`.

Consórcios exige permissão própria:

- leitura: `consorciosVisualizar`, `consorciosEditar` ou Administração FP&A;
- criação/edição: `consorciosEditar` ou Administração FP&A;
- grupo e empresa devem permanecer dentro do escopo permitido;
- exclusão física é bloqueada.

Quando `firestore.rules` mudar, publicar a Rule completa no Firebase antes de considerar a release encerrada.

---

## 6. QA mínimo pós-release

### Plano / Relatórios

- validar `1.01 → 1.01.01 → 1.01.01.0001`;
- validar expandir/recolher, filtros, inativar/reativar e exclusão segura;
- Balanço deve mostrar N1 → N2 → Analítica;
- trimestre/ano devem ter coluna final de fechamento sem somar saldos mensais;
- comparativo anual deve usar dezembro atual x dezembro Last Year;
- DRE e Input devem continuar respeitando a hierarquia v6.

### Consórcios

- perfil somente consulta visualiza a carteira sem ação de edição;
- perfil de gestão cria e edita ficha;
- novo cadastro exige uma empresa;
- visão da carteira pode consolidar empresas selecionadas;
- carta atual substitui a carta contratada como base quando informada;
- taxa do consórcio soma administração + reserva + seguro/outros;
- juros/encargos permanecem separados;
- parcela atual permanece separada da média estimada;
- valor pago acumulado altera o saldo teórico;
- contemplação registra data, modalidade e lance;
- nenhum valor do módulo deve aparecer automaticamente em DRE, Balanço, Caixa ou Planejamento.

### Firebase

- Imobilizado continua carregando;
- delete seguro do Plano continua funcionando;
- Consórcios carrega com Rules publicadas;
- perfil somente consulta não grava Consórcios;
- exclusão de Consórcios permanece bloqueada.

---

## 7. Rollback

Se a versão falhar:

1. não apagar histórico;
2. reverter frontend para último SHA estável;
3. reverter Rules apenas com versão completa conhecida;
4. publicar frontend e Rules correspondentes;
5. registrar causa e correção.

Se já houver dados persistidos no formato novo, tratar rollback como migração controlada.

---

## 8. Princípios

- uma fonte de verdade por regra;
- código e documentação mudam juntos;
- regras de negócio não ficam só na UI;
- matemática reutilizável fica fora da tela;
- dados contábeis não são alterados para mascarar bug visual;
- integração crítica é fail-closed;
- módulo independente não gera lançamentos sem desenho aprovado;
- arquivos legados não definem comportamento ativo;
- histórico real não é apagado;
- merge somente depois de QA do HEAD final.