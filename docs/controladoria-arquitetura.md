# Controladoria & FP&A — Arquitetura Modular Vigente

**Baseline:** 01/09/2026 — Plano de Contas v6 + permissões modulares + visões gerenciais do Balanço + Consórcios v1.

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
- Consórcios — `ctrl-consorcios-v1.js`;
- Plano de Contas — `ctrl-chart-accounts-v6.js`;
- Centros de Custo — `ctrl-cost-centers-v2.js`;
- Configurações — `ctrl-settings.js`.

## Permissões da Controladoria

O acesso ao menu pai continua condicionado a `controladoria.visualizar`, mas cada submódulo deve respeitar sua ação específica no perfil.

Permissões explícitas de consulta:

- `controladoria.dre` — Visualizar DRE Gerencial;
- `controladoria.balanco` — Visualizar Balanço Patrimonial;
- `controladoria.consorciosVisualizar` — Visualizar consórcios.

Permissão de gestão de Consórcios:

- `controladoria.consorciosEditar` — criar e editar fichas de consórcios.

Demais submódulos usam suas ações funcionais já existentes, por exemplo `budget`, `forecast`, `premissas`, `imobilizado`, `planoContas`, `centrosCusto`, `caixaVisualizar`, `prestacao`, `fechamento` e correlatas.

`js/controllership-router.js` deve:

- recalcular a visibilidade do submenu em cada `sig:ready` e `sig:page`;
- bloquear a ação também no clique, não apenas esconder o botão;
- limpar o cache lógico de módulos a cada novo login;
- versionar o import dinâmico com usuário + perfil para evitar reaproveitar instâncias de tela entre sessões diferentes na mesma página.

Perfis antigos que ainda não possuem as chaves `dre`/`balanco` mantêm temporariamente o comportamento legado baseado em `controladoria.visualizar`. Ao editar e salvar o perfil novamente, as novas chaves passam a ficar explícitas. Consórcios não possui fallback legado: exige permissão explícita ou Administração FP&A.

As permissões de DRE/Balanço são controle de funcionalidade/interface. Como esses relatórios reutilizam coleções contábeis compartilhadas com outros módulos, a confidencialidade dos documentos no Firestore continua baseada em `controladoria.visualizar`, grupo e empresa acessível. A coleção `consorcios` usa as permissões próprias também nas Firestore Rules.

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

O Balanço possui duas visões:

1. **Evolução mensal + fechamento** — mantém os meses visíveis e acrescenta uma coluna final de fechamento quando o período é trimestral ou anual. `Total T1/T2/T3/T4` corresponde ao saldo do último mês do trimestre; `Total Ano` corresponde ao saldo de dezembro. Balanço é posição e nunca soma os saldos mensais.
2. **Comparativo anual** — apresenta uma única posição do ano atual, uma coluna `Last Year`, `Variação R$` e `Variação %`. Ano atual e Last Year usam posição de dezembro. A variação em valor é `Atual − LY`; a percentual usa o módulo do saldo LY como base. Quando LY é zero e o atual não é zero, a variação percentual é exibida como não aplicável (`—`).

Na comparação anual a estrutura considera contas vigentes no ano atual ou no ano anterior, evitando esconder histórico apenas porque uma conta foi inativada entre os exercícios.

A primeira coluna do Balanço possui largura controlada para preservar espaço das colunas financeiras e evitar que a descrição ocupe desnecessariamente a maior parte da tela.

### DRE

Por Centro de Custo, a árvore usa `contaPaiId` e suporta profundidade v6. Na visão consolidada por código, a DRE reconstrói N1 e N2 antes das Analíticas.

## Consórcios v1

`js/ctrl-consorcios-v1.js` é uma tela de gestão gerencial independente. `js/consortium-calculations.js` concentra a matemática para que cálculo e interface não fiquem acoplados.

Escopo funcional da v1:

- carteira por empresa ou visão consolidada das empresas selecionadas;
- status `ativo`, `contemplado`, `encerrado` e `cancelado`;
- administradora, grupo, cota, categoria e datas;
- carta contratada e carta atual/reajustada;
- prazo, parcelas pagas, valor pago acumulado e parcela atual;
- taxa de administração, fundo de reserva, seguro/outros e juros/encargos opcionais;
- cálculo de taxa total do consórcio, custo adicional, total estimado do plano, parcela média e saldo teórico;
- contemplação por sorteio/lance, valor de lance, crédito utilizado e bem/finalidade;
- KPIs de carteira ativa, contemplados, crédito, parcela mensal e saldo teórico.

Regras de cálculo:

- a base é a carta de crédito atual; se não informada, usa a carta contratada;
- `taxa do consórcio = administração + fundo de reserva + seguro/outros`;
- juros/encargos ficam separados e só devem ser informados quando efetivamente previstos no contrato;
- parcela média é uma estimativa gerencial do total estimado dividido pelo prazo total;
- se houver `valorPagoAcumulado`, o saldo teórico é `total estimado − valor pago acumulado`; caso contrário, é estimado pela parcela média × parcelas restantes;
- a parcela atual informada permanece separada da parcela média para refletir reajustes reais do plano.

**Limite arquitetural deliberado da v1:** Consórcios não gera lançamentos e não alimenta DRE, Balanço, Fluxo de Caixa, Budget, Forecast ou Imobilizado. Qualquer integração futura exige decisão explícita de modelagem contábil e migração documentada.

Consórcios não permite exclusão física nas Rules. Para preservar histórico, fichas devem ser encerradas ou canceladas.

## Centros técnicos

- Balanço: `__cc_balanco__`;
- Estatísticas: `__cc_estatistico__`.

Matriz de Centros de Custo trabalha por ID de Analítica financeira e não depende da máscara textual.

## Planejamento

Budget e Forecast trabalham em folhas Analíticas. Premissas são resolvidas por competência e vigência. Depreciação automática do Imobilizado integra Budget/Forecast conforme Conta × CC.

Consórcios v1 não participa do planejamento automático.

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
- `consorcios`;
- `fechamentosMensais` / `fechamentoTarefas`;
- `permutas` / `permutaMovimentos`.

A Rule de `planoContasGerencial` permite exclusão apenas a `fpaPlano()` no documento acessível. O frontend deve bloquear exclusão se houver histórico/vínculo.

A Rule de `consorcios` exige permissão específica de consulta para leitura e `consorciosEditar`/Administração FP&A para criação e atualização. Grupo e empresa são imutáveis em update; delete é bloqueado.

## Legado

Arquivos de versões antigas podem permanecer no repositório, mas não devem ser considerados ativos sem rota explícita. Contas anteriores ao contrato v6 podem aparecer como legado/teste até limpeza segura.