# SIG — Release da Controladoria e Migração

**Atualizado em:** 16/09/2026

## Fluxo padrão

`feature branch → CI verde → preview isolado → homologação do usuário → ajustes → aprovação → merge main → produção`

Funcionalidade nova não deve ir para `main` apenas para permitir visualização.

## Documentação

Todo pacote relevante deve atualizar:
- `docs/SIG-BASELINE-ATUAL.md` quando mudar uma diretriz vigente;
- Manual/Dossiê/Guia quando houver impacto de continuidade;
- documentação específica do módulo;
- QA correspondente.

## Firebase

Se `firestore.rules` mudar:
- publicar a Rule completa do mesmo HEAD;
- testar autorização positiva/negativa;
- registrar explicitamente no handoff.

Se Rules não mudarem, declarar que não há republicação necessária.

Storage permanece fora da release atual até ativação explícita.

## Navegação atual

A release vigente organiza:
- Vendas & Comissões em Comercial;
- Contratos, Contas a Pagar, Permutas e Consórcios visualmente dentro de Controladoria & FP&A.

Não alterar namespaces de permissão ou coleções por causa dessa navegação.

## Migração Script → SIG

A migração é tela por tela. Para cada tela:
1. inventário funcional do Script;
2. desenho no padrão SIG;
3. implementação em branch;
4. CI;
5. preview;
6. homologação;
7. Rules/persistência final;
8. merge.

Primeira tela: Produção, PR #30, ainda em homologação.

## Rollback

- preservar dados;
- reverter frontend para SHA estável;
- reverter Rules apenas para arquivo completo conhecido;
- não apagar histórico para facilitar rollback;
- documentar causa e correção.

## Critério de pronto

Uma tela só é considerada concluída quando código, permissões, Rules aplicáveis, QA, documentação e homologação estiverem alinhados.