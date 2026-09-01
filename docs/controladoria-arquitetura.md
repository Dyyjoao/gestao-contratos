# Controladoria & FP&A — Arquitetura Modular Vigente

**Baseline:** 01/09/2026 — Plano de Contas v6 + permissões modulares de DRE/Balanço.

Este arquivo é um mapa operacional curto. Para regras completas, ler `docs/SIG-DOSSIE-DE-CONTINUIDADE.md` e `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`.

## Rotas atuais

`js/controllership-router.js` é a fonte de verdade:

- DRE — `ctrl-dre-v6.js`;
- Balanço — `ctrl-balance-sheet-v1.js`;
- Input Mensal — `ctrl-input-v6.js`;
- Budget — `ctrl-budget-v7.js`;
- Forecast — `ctrl-forecast-v5.js`;
- Fluxo de Caixa — `cashflow.js`;
- Prestação — `accountability.js`;
- Fechamento — `closing-v3.js`;
- Permutas — `permutas.js`;
- Premissas — `ctrl-premises-v4.js`;
- Imobilizado — `ctrl-assets-v1.js`;
- Plano de Contas — `ctrl-chart-accounts-v6.js`;
- Centros de Custo — `ctrl-cost-centers-v2.js`;
- Configurações — `ctrl-settings.js`.

## Permissões da Controladoria

O acesso ao menu pai continua condicionado a `controladoria.visualizar`, mas cada submódulo deve respeitar sua ação específica no perfil.

Permissões explícitas de consulta:

- `controladoria.dre` — Visualizar DRE Gerencial;
- `controladoria.balanco` — Visualizar Balanço Patrimonial.

Demais submódulos usam suas ações funcionais já existentes, por exemplo `budget`, `forecast`, `premissas`, `imobilizado`, `planoContas`, `centrosCusto`, `caixaVisualizar`, `prestacao`, `fechamento` e correlatas.

`js/controllership-router.js` deve:

- recalcular a visibilidade do submenu em cada `sig:ready` e `sig:page`;
- bloquear a ação também no clique, não apenas esconder o botão;
- limpar o cache lógico de módulos a cada novo login;
- versionar o import dinâmico com usuário + perfil para evitar reaproveitar instâncias de tela entre sessões diferentes na mesma página.

Perfis antigos que ainda não possuem as chaves `dre`/`balanco` mantêm temporariamente o comportamento legado baseado em `controladoria.visualizar`. Ao editar e salvar o perfil novamente, as novas chaves passam a ficar explícitas.

As permissões de DRE/Balanço são controle de funcionalidade/interface. Como os relatórios reutilizam coleções contábeis compartilhadas com outros módulos, a confidencialidade dos documentos no Firestore continua baseada em `controladoria.visualizar`, grupo e empresa acessível.

## Plano de Contas v6

Máscara canônica: `#.##.##.####`.

Estrutura:

`Raiz → Sintética N1 (#.##) → Sintética N2 (#.##.##) → Analítica (#.##.##.####)`.

Exemplo:

`1 Ativo → 1.01 Ativo Circulante → 1.01.01 Disponibilidades → 1.01.01.0001 Caixa`.

`js/account-mask.js` centraliza máscara, raízes, natureza e multiplicadores. `js/account-tree.js` centraliza descendência/folhas por `contaPaiId`.

Plano v6 oferece:

- árvore expansível/recolhível;
- filtro Ativas / Inativas / Todas;
- inativação por exercício;
- reativação;
- exclusão segura de cadastro sem uso;
- limpeza de legado/testes;
- cópia de estrutura v6.

## Consolidação

### Balanço

Hierarquia exibida: Raiz → N1 → N2 → Analítica.

Analíticas são consolidadas por código entre empresas. Sintéticas podem ser reconstruídas pelos dois prefixos da máscara. Legado ainda preservado participa da reconciliação da raiz.

### DRE

Por Centro de Custo, a árvore usa `contaPaiId` e suporta profundidade v6. Na visão consolidada por código, a DRE reconstrói N1 e N2 antes das Analíticas.

## Centros técnicos

- Balanço: `__cc_balanco__`;
- Estatísticas: `__cc_estatistico__`.

Matriz de Centros de Custo trabalha por ID de Analítica financeira e não depende da máscara textual.

## Planejamento

Budget e Forecast trabalham em folhas Analíticas. Premissas são resolvidas por competência e vigência. Depreciação automática do Imobilizado integra Budget/Forecast conforme Conta × CC.

## Persistência

Coleções centrais:

- `planoContasGerencial`;
- `centrosCusto`;
- `realizadoMensal`;
- `budgetLinhas`;
- `forecastLinhas`;
- `planejamentoDetalhes`;
- `premissasPlanejamento`;
- `imobilizados`;
- `fechamentosMensais` / `fechamentoTarefas`;
- `permutas` / `permutaMovimentos`.

A Rule de `planoContasGerencial` permite exclusão apenas a `fpaPlano()` no documento acessível. O frontend deve bloquear exclusão se houver histórico/vínculo.

## Legado

Arquivos de versões antigas podem permanecer no repositório, mas não devem ser considerados ativos sem rota explícita. Contas anteriores ao contrato v6 podem aparecer como legado/teste até limpeza segura.
