# SIG — Guia Operacional de Continuidade

**Finalidade:** retomar o SIG em outra conversa, IA, equipe, computador, repositório ou hospedagem sem depender de memória informal.  
**Data-base:** 01/09/2026 — Plano de Contas v6.

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

Nunca deduza módulo ativo apenas pelo nome do arquivo. Na Controladoria, confira o roteador.

---

## 2. Estado estrutural atual

Plano de Contas ativo: `js/ctrl-chart-accounts-v6.js`.

Máscara:

`#.##.##.####`

Hierarquia:

`Raiz → Sintética N1 (#.##) → Sintética N2 (#.##.##) → Analítica (#.##.##.####)`.

Novos registros v6 têm `versaoMascara: "v6"`. Contas antigas não são convertidas implicitamente.

Ações do Plano v6:

- expandir/recolher ramos pela seta;
- filtrar Ativas / Inativas / Todas;
- inativar por exercício;
- reativar conta ou ramo;
- excluir cadastro sem uso;
- limpar legado/testes sem referências;
- copiar apenas estrutura v6 para outra empresa.

---

## 3. Como retomar desenvolvimento

1. confirme a branch e o HEAD;
2. compare com `main`;
3. leia o roteador e os módulos afetados;
4. busque consumidores indiretos antes de mudar formato de dados/máscara;
5. altere documentação no mesmo pacote;
6. rode QA;
7. só promova depois dos checks verdes.

Para mudanças de Plano de Contas, revisar obrigatoriamente:

- `js/account-mask.js`;
- `js/account-tree.js`;
- módulo ativo do Plano;
- Balanço;
- DRE consolidada;
- Input;
- Budget/Forecast;
- matriz de Centros de Custo;
- Firestore Rules;
- documentação e workflows.

---

## 4. Exclusão versus inativação

**Inativação** é a opção padrão para conta que já teve vida real no sistema. Preserva histórico por exercício.

**Exclusão** é somente para:

- teste;
- duplicidade sem uso;
- cadastro errado sem histórico ou vínculo.

O Plano v6 verifica referências antes de excluir. Se qualquer vínculo for encontrado, não contorne a proteção removendo a conta diretamente pelo console do Firebase. Regularize a dependência ou mantenha a conta inativa.

A ação `Limpar legado/testes` segue a mesma regra.

---

## 5. Firebase

Frontend e backend têm ciclos de publicação diferentes.

GitHub Pages publica HTML/CSS/JS. Não publica:

- `firestore.rules`;
- `storage.rules`;
- configurações administrativas Firebase.

Esta versão altera a Rule de `planoContasGerencial` para permitir delete a usuário com permissão de Plano no documento acessível. Portanto, depois da promoção desta versão para `main`, as Rules precisam ser republicadas.

Com Firebase CLI autenticado:

```bash
firebase deploy --only firestore:rules,storage
```

Pelo console, é possível publicar a `firestore.rules` completa na aba **Firestore Database → Regras**.

Não considerar release concluído até um teste autenticado confirmar a operação nova.

---

## 6. QA mínimo pós-release

### Plano de Contas

1. criar `1.01 Ativo Circulante`;
2. criar `1.01.01 Disponibilidades`;
3. criar `1.01.01.0001 Caixa`;
4. recolher/expandir `1.01` e `1.01.01`;
5. inativar uma conta sem uso;
6. confirmar que aparece **Reativar**;
7. testar filtros Ativas / Inativas / Todas;
8. reativar;
9. criar conta de teste sem uso e excluir;
10. confirmar que conta com referência não pode ser excluída.

### Relatórios

- Balanço mostra N1 → N2 → Analítica;
- DRE por CC mantém árvore correta;
- DRE consolidada mostra N1 → N2 → Analítica;
- Input continua lançando somente Analíticas;
- Budget/Forecast continuam trabalhando apenas com folhas Analíticas e Centros permitidos.

### Firebase

- Imobilizado continua carregando;
- delete seguro no Plano funciona após Rules publicadas;
- usuário sem permissão de Plano não consegue excluir via Firestore.

---

## 7. Rollback

Se a v6 falhar antes de dados reais novos serem criados:

1. não apagar histórico existente;
2. reverter frontend para último SHA estável;
3. reverter `firestore.rules` somente se necessário e com Rule completa conhecida;
4. publicar novamente frontend/Rules correspondentes;
5. registrar causa e correção.

Se já houver contas v6 persistidas, não retornar silenciosamente para um frontend que não entende `#.##.##.####`. Tratar rollback como migração controlada.

---

## 8. Princípios que evitam perda de coerência

- uma fonte de verdade por regra;
- código e documentação mudam juntos;
- regras de negócio não ficam só na UI;
- dados contábeis não são alterados para mascarar bug visual;
- integração crítica é fail-closed;
- arquivos legados não definem comportamento ativo;
- histórico com uso é inativado, não apagado;
- merge só ocorre depois de QA do HEAD final.
