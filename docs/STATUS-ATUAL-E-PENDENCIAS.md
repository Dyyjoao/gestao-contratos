# SIG — Status Atual e Pendências Ativas

> Este arquivo é o checklist operacional da rodada em desenvolvimento. Não é documentação histórica. Uma alteração só pode ser promovida ao `main` quando os itens marcados como BLOQUEADOR estiverem concluídos e validados.

## Branch ativa

`chatgpt/mascara-contas-balanco-centros`

## BLOQUEADORES antes de publicar

### 1. Minha Mesa — criticidade do caixa
- [ ] Corrigir alerta de caixa para identificar o **primeiro horizonte em que o saldo projetado fica negativo**.
- [ ] Horizontes: Hoje, D+30, D+60 e D+90.
- [ ] O título deve refletir o horizonte real: ex. `Caixa projetado negativo em D+30`.
- [ ] Mostrar também a data real da primeira ruptura do saldo e a menor posição projetada dentro do horizonte analisado.
- [ ] Validar contra a mesma lógica usada no módulo Fluxo de Caixa.

### 2. Budget — validação funcional obrigatória
- [ ] Exercício vem exclusivamente do cabeçalho global.
- [ ] Ao trocar o exercício no cabeçalho, carregar orçamento do novo exercício.
- [ ] Ciclo: Não aberto -> Em elaboração -> Finalizado -> Reaberto.
- [ ] Nova versão por exercício sem sobrescrever versão anterior.
- [ ] Linha principal não editável; lançamento somente por sublinhas Analíticas.
- [ ] Conta Sintética = soma automática das Analíticas filhas.
- [ ] Premissa ativa bloqueia lançamento manual.
- [ ] Estatísticas usam CC técnico invisível e aparecem no topo.
- [ ] Ativo/Passivo nunca aparecem no Budget.
- [ ] Linha `RESULTADO / SALDO` no final.
- [ ] Validar A-1, cálculo de variação e detalhamento de linhas.

### 3. Forecast — validação funcional obrigatória
- [ ] Meses fechados vêm exclusivamente do Realizado.
- [ ] Meses futuros usam projeção por sublinhas/premissas.
- [ ] Linha principal não editável; Sintéticas somam filhas.
- [ ] Premissa ativa bloqueia manual.
- [ ] Estatísticas usam CC técnico invisível e aparecem no topo.
- [ ] Ativo/Passivo nunca aparecem no Forecast.
- [ ] Linha `RESULTADO / SALDO` no final.
- [ ] Validar detalhamento de linhas sem apagar valores existentes.

### 4. Centros de Custo — remover retorno ao FP&A legado
- [ ] Salvar/editar CC deve permanecer na tela atual de Centros de Custo.
- [ ] Não chamar `fpa.js`/tela antiga após salvar.
- [ ] `Contas permitidas` deve usar a matriz atual diretamente.
- [ ] Matriz deve listar apenas contas Analíticas financeiras de DRE.
- [ ] Sintéticas, Estatísticas, Ativo e Passivo não entram na matriz.

### 5. Plano de Contas — nova máscara e governança
- [x] Raízes reservadas: `1 Ativo`, `2 Passivo`, `3 Receita`, `4 Despesa`, `9 Estatística`.
- [x] Máscara fixa `#.##.####`.
- [x] Código gerado automaticamente pela conta mãe.
- [x] Máximo de dois níveis Sintéticos contando a raiz.
- [x] Analítica nunca recebe filhos.
- [x] CC técnico invisível `CC-ESTATISTICO`.
- [x] Fundação do CC técnico invisível `CC-BALANCO`.
- [ ] Estatística deve ter `modoPreenchimento: manual | automatico` independente do tipo estatístico.
- [ ] Manual permite Input; Automática bloqueia Input e depende da regra/fórmula.
- [ ] Copiar Plano de Contas de uma empresa para outra preservando hierarquia e gerando novos IDs.
- [ ] Inativação temporal por vigência, sem apagar histórico.
- [ ] Só permitir inativação para o exercício quando a conta não tiver saldo/movimento no período afetado.
- [ ] Relatórios devem respeitar vigência histórica da conta.

## Próximas fundações já aprovadas — não implementar correndo nesta rodada

### Balanço Patrimonial
- CC técnico invisível `CC-BALANCO`.
- Input de **saldo final mensal**, não movimento acumulado.
- Balanço mensal, trimestral/período, anual e consolidado.
- Mesma experiência da DRE: árvore Sintética/Analítica, expandir/recolher, PDF e Excel.
- Análise Horizontal e Vertical.
- Dashboard patrimonial com Ativo, Passivo/PL, liquidez, capital de giro, endividamento, ROA/ROI, giro do ativo, capital a descoberto e alertas gerenciais.

### Premissas Tributárias
- Motor próprio e separado das premissas operacionais.
- Regras versionadas por exercício/vigência.
- Preparado para Simples Nacional, Lucro Presumido, Lucro Real e transição da Reforma Tributária (CBS/IBS e regras futuras).
- Cenários tributários devem poder alimentar Budget, Forecast e Fluxo de Caixa.

### Prestação de Contas
- **Não alterar estrutura/tela nesta rodada.**
- Alteração futura será somente de conteúdo e profundidade analítica.

## Regra de promoção

Antes de promover a branch ao `main`:
1. executar `node --check` em todos os JS;
2. importar em Chrome headless Plano de Contas, Centros, Input, Budget, Forecast, DRE e Minha Mesa;
3. validar os contratos arquiteturais acima no Quality Check;
4. somente depois fazer fast-forward para `main` e confirmar GitHub Pages.
