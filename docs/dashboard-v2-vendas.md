# SIG — Dashboard Gerencial v2 e Vendas & Comissões

**Data-base:** 02/09/2026  
**Status:** arquitetura de release da branch `feature/dashboard-v2-vendas`.

## 1. Objetivo

Esta evolução substitui o dashboard financeiro fixo por um **cockpit gerencial configurável**, orientado a decisão, e adiciona o módulo operacional/comercial **Vendas & Comissões** como área de primeiro nível do SIG.

Princípios do desenho:

- número importante deve vir com contexto, tendência, comparação ou meta;
- resumo deve permitir aprofundamento no módulo de origem;
- o Dashboard cruza visões, mas **não vira fonte contábil**;
- Vendas, Consórcios e Permutas permanecem independentes da DRE/Balanço/Caixa, salvo integração futura formalmente aprovada;
- não há bloco “Atalhos de Gestão”: o menu principal já é curto e deve continuar sendo a navegação primária;
- widgets e ações respeitam as mesmas permissões dos módulos de origem.

## 2. Dashboard Gerencial v2

Entrada ativa:

- `js/dashboard-v2.js` — ponto de entrada/compatibilidade;
- `js/dashboard-cockpit-v2.js` — implementação do cockpit;
- `dashboard-v2.css` — apresentação.

O cockpit trabalha com portlets/widgets configuráveis por usuário. A preferência é persistida na coleção `dashboardPreferencias`, documento com ID igual ao UID do usuário.

### Widgets previstos/ativos

- Resumo executivo: Receita, OPEX, Resultado, Margem, Caixa e Inadimplência;
- Evolução mensal: Receita, OPEX e Resultado;
- Análise patrimonial: Ativo, Passivo + PL, equação patrimonial, comparação com Last Year e maiores movimentos;
- Caixa: posição atual e D+30 / D+60 / D+90;
- Inadimplência & Aging;
- Consórcios;
- Permutas;
- Vendas & Comissões;
- Maiores desvios Realizado x Budget.

### Configuração do usuário

O usuário pode:

- exibir/ocultar widgets aos quais possua acesso;
- alterar a ordem dos widgets;
- restaurar a configuração padrão.

A v2 usa botões subir/descer em vez de drag-and-drop para manter comportamento previsível em desktop e celular.

A Rule de `dashboardPreferencias` só permite ao usuário autenticado ler/criar/alterar o próprio documento. Preferências de outro usuário nunca são compartilhadas.

## 3. Fontes e interpretação do Dashboard

O Dashboard somente consulta dados que o perfil já poderia consultar nos respectivos módulos.

### DRE / Budget / Forecast

Fonte gerencial compartilhada: `js/financial-reporting.js`.

- Realizado é calculado a partir das linhas vigentes do realizado;
- Budget usa a versão atual por empresa;
- Forecast combina realizado fechado e projeção conforme contrato vigente;
- variação nunca regrava valores brutos.

### Balanço

O Dashboard apresenta **posição de fechamento**, não soma de saldos mensais.

- compara o mês de referência com o mesmo mês do ano anterior;
- exibe equação `Ativo - Passivo/PL` como controle de integridade;
- considera integração patrimonial de Imobilizado onde configurada;
- o detalhe oficial continua sendo `js/ctrl-balance-sheet-v1.js`.

### Caixa

Apresenta posição liquidada e projeção D+30/D+60/D+90 a partir das contas e movimentos de caixa. O módulo oficial continua sendo a fonte detalhada.

### Inadimplência

Usa `inadimplenciaTitulos` e apresenta carteira, vencido, índice e aging. O detalhe oficial permanece em `js/ctrl-delinquency-v1.js`.

### Consórcios e Permutas

São posições gerenciais independentes. Mostrar esses números no Dashboard **não cria lançamento contábil, financeiro, Budget ou Forecast**.

## 4. Vendas & Comissões

Arquivos:

- `js/sales.js` — cadastro, vendas, faturamento e comissão;
- `js/sales-guard.js` — proteção adicional de campos financeiros na interface;
- `js/sales-performance.js` — cockpit por vendedor;
- `sales.css` e `sales-performance.css` — apresentação.

Vendas é módulo de primeiro nível, posicionado após Permutas. **Não pertence à Controladoria & FP&A.**

Coleções:

- `vendedores`;
- `vendas`.

Não existe delete físico nesta versão. Vendedor deve ser inativado; venda incorreta deve ser cancelada para preservar histórico.

## 5. Cadastro de vendedor

Campos centrais:

- nome/e-mail;
- empresa;
- meta mensal;
- comissão padrão (%);
- **Comissão gerada por:** `venda` ou `faturamento`;
- status ativo/inativo.

A alteração futura da regra do vendedor não recalcula vendas anteriores.

## 6. Snapshot de comissão

Cada venda grava a regra aplicada no momento da operação:

- `baseComissao`;
- `comissaoPct`;
- `comissaoBaseValor`;
- `comissaoValor`;
- `comissaoStatus`.

Isso evita que uma alteração posterior no cadastro do vendedor reescreva o histórico.

### Comissão por venda

Base = valor da venda confirmada.

### Comissão por faturamento

Base = valor efetivamente faturado.

- faturamento parcial é permitido;
- `valorFaturado` não pode superar o valor da venda;
- sem faturamento, a comissão permanece `aguardando_faturamento`;
- após existir base faturada, a comissão passa a poder ser provisionada/aprovada/paga.

Status de comissão:

1. `aguardando_faturamento`;
2. `provisionada`;
3. `aprovada`;
4. `paga`.

## 7. Cockpit de performance por vendedor

`js/sales-performance.js` adiciona uma leitura visual além do ranking tradicional.

### Insights executivos

- líder de vendas e participação no total;
- maior atingimento de meta;
- maior gap Venda x Faturamento;
- maior comissão do período.

### Comparativo por vendedor

Cada vendedor possui barras comparáveis de:

- Venda;
- Faturamento;
- Meta.

E indicadores:

- atingimento da meta;
- Faturado/Venda;
- ticket médio;
- comissão.

O sistema também gera leituras gerenciais, por exemplo:

- “Meta batida · faturamento saudável”;
- “Meta batida · faturamento pendente”;
- “Gap alto entre venda e faturamento”;
- “Próximo da meta”;
- “Faturamento inclui carteira anterior”.

Clicar no vendedor filtra a carteira detalhada daquele vendedor.

## 8. Permissões

Bloco `vendas` em Perfis de Acesso:

- `visualizar` — consultar Vendas & Comissões;
- `lancar` — registrar vendas;
- `editar` — editar/cancelar vendas;
- `vendedores` — gerir vendedores, metas e regras;
- `comissoes` — gerir taxa excepcional, aprovação e pagamento de comissão.

Quem somente registra vendas não deve conseguir inventar taxa/base diferente da regra do vendedor.

## 9. Firestore Rules

### `vendedores`

- read: qualquer autorização de Vendas;
- create/update: `vendas.vendedores`;
- escopo obrigatório grupo + empresa;
- comissão entre 0% e 100%;
- base somente `venda` ou `faturamento`;
- delete físico bloqueado.

### `vendas`

- read: qualquer autorização de Vendas;
- create: exige `vendas.lancar`, vendedor válido, grupo/empresa corretos e cálculo coerente;
- sem `vendas.comissoes`, base e taxa devem corresponder ao cadastro do vendedor;
- update operacional: `vendas.editar` com preservação das chaves de comissão para quem não possui autorização financeira;
- update financeiro restrito: `vendas.comissoes`;
- venda com comissão aprovada/paga recebe trava adicional contra alteração financeira por editor operacional;
- delete físico bloqueado.

## 10. QA obrigatório

Antes de promover:

- `node --check` em Dashboard e Sales;
- confirmar Vendas no grid de Perfis;
- confirmar menu Vendas após Permutas e fora do submenu Controladoria;
- confirmar que `salesPct` e status financeiro são protegidos para usuário sem `vendas.comissoes`;
- confirmar Rules de `dashboardPreferencias`, `vendedores` e `vendas`;
- confirmar ausência de `Atalhos de Gestão` no dashboard;
- testar Dashboard com widgets ocultos/reordenados;
- testar vendedor por Venda e por Faturamento;
- testar faturamento parcial;
- testar comissão aguardando/provisionada/aprovada/paga;
- testar filtro ao clicar no mapa de vendedor;
- confirmar que Vendas não altera DRE/Balanço/Caixa automaticamente.

## 11. Release e Firebase

GitHub Pages publica somente frontend. A release que altera `firestore.rules` não está concluída até a Rule completa correspondente ao SHA de produção ser publicada no Firebase.

Nunca publicar fragmento isolado da Rule: substituir/publicar o arquivo completo validado da `main`.
