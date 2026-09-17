# SIG — Arquitetura da Controladoria & FP&A

**Atualizado em:** 16/09/2026

## 1. Papel da Controladoria

A Controladoria & FP&A é a área gerencial do SIG. Sua navegação agora também agrupa visualmente Contratos, Contas a Pagar, Permutas e Consórcios, mas esses módulos mantêm identidade própria.

**Não confundir agrupamento visual com fusão de arquitetura.**

## 2. Módulos nativos

Fonte de rotas: `js/controllership-router.js`.

- DRE Gerencial;
- Balanço Patrimonial;
- Inadimplência & Aging;
- Input Mensal;
- Budget;
- Forecast;
- Fluxo de Caixa;
- Prestação de Contas;
- Cockpit de Fechamento;
- Premissas;
- Imobilizado & CAPEX;
- Plano de Contas;
- Centros de Custo;
- Configurações.

## 3. Módulos visualmente transferidos para a área

Ordem definida:
1. Contratos;
2. Contas a Pagar;
3. Permutas;
4. Consórcios;
5. módulos nativos da Controladoria.

Permissões continuam próprias:
- `contratos.*`;
- `contasPagar.*`;
- `permutas.*`;
- `consorcios.*` / compatibilidade existente.

Coleções também permanecem próprias.

## 4. DRE aprovada

A DRE vigente foi restaurada no PR #28.

Visões:
- DRE Gerencial — principal;
- Detalhar contas;
- Estrutura do plano;
- Outras visualizações;
- DRE Societária · CPC 51.

Linhas gerenciais incluem Receita Bruta, Deduções, Receita Líquida, Custos, Lucro Bruto, Despesas Variáveis, Margem de Contribuição, Pessoal, Operacionais, Administrativas, Comerciais, EBITDA Gerencial, Depreciação/Amortização, Resultado Operacional, Financeiro, Investimentos, Outros Resultados, Tributos e Resultado Líquido.

Totalizadores são calculados e não devem virar contas lançáveis.

## 5. Plano de Contas

Máscara `#.##.##.####`.

Somente Analíticas são lançáveis. Contas de resultado estão nas raízes 3 e 4.

`codigoReduzido` é referência opcional do Pangéia e nunca determina hierarquia/consolidação.

Conta analítica de resultado pode receber classificação de Linha DRE Gerencial e Categoria CPC 51.

## 6. Centros de Custo

Budget/Forecast e contratos respeitam `contasPermitidas` do Centro de Custo. Conta nova do Plano só deve aparecer no planejamento do CC depois de autorizada.

## 7. Contratos como drivers

Contratos podem gerar planejamento e provisões conforme flags.

Requisitos para planejamento:
- conta Analítica de Resultado;
- conta ativa no exercício;
- CC válido;
- conta autorizada no CC;
- contrato vigente.

Reajuste usa motor compartilhado. Alterações relevantes devem recalcular competências futuras/abertas e preservar histórico protegido.

## 8. Contas a Pagar dentro da área

O cockpit fica visualmente em Controladoria, mas continua operacional e independente:
- não é ledger;
- não alimenta DRE;
- não alimenta Budget/Forecast;
- não cria Fluxo de Caixa automaticamente;
- pode receber obrigações de Contratos.

## 9. Balanço

Balanço é posição, não fluxo. Trimestre/ano usam posição final da competência aplicável e não soma de saldos mensais.

## 10. Forecast

Forecast combina Realizado fechado com projeção futura. Sincronizações automáticas devem respeitar fechamento/realizado e não reescrever meses protegidos.

## 11. Integrações não autorizadas automaticamente

Não criar sem aprovação explícita:
- Produção/Descarte → DRE;
- Produção/Descarte → custo/estoque;
- Contas a Pagar → DRE/Budget/Forecast/Caixa;
- Consórcios → demonstrativos/planejamento;
- Permutas → contabilidade automática;
- Vendas → Receita/Contas a Receber/DRE automática.

## 12. QA

Toda alteração da Controladoria deve revisar:
- roteador;
- permissões;
- Plano/CC;
- DRE/Balanço;
- Budget/Forecast;
- Rules quando aplicável;
- sincronizadores de Contratos;
- Dashboard;
- documentação.

Mudanças relevantes seguem preview-first.