# SIG — Contas a Pagar · Cockpit Operacional

**Atualizado em:** 16/09/2026

## Papel do módulo

Contas a Pagar é um cockpit operacional de compromissos fixos e vencimentos. Ele aparece visualmente dentro de **Controladoria & FP&A**, mas continua independente em regra, coleção e permissão.

Descrição funcional:

`Cockpit operacional de compromissos fixos e vencimentos. Não alimenta DRE, Budget ou Forecast.`

Também não cria automaticamente lançamentos no Fluxo de Caixa.

## Permissões

Módulo próprio `contasPagar`:
- `visualizar`;
- `cadastrar`;
- `editar`;
- `baixar`.

Estorno/reabertura administrativa permanece protegida pela política ADM.

## Radar

Leituras centrais:
- vencidos;
- vence hoje;
- próximos 7 dias;
- próximos 30 dias;
- pagos no período.

Minha Mesa deve destacar Vencidos, Hoje e Próximos 7 dias.

## Lançamento manual

Campos centrais:
- empresa;
- fornecedor;
- documento;
- descrição;
- categoria;
- vencimento;
- valor;
- responsável;
- observação;
- recorrência quando aplicável;
- conta bancária planejada.

## Contratos

Contratos podem alimentar o cockpit.

Regras atuais:
- geração usa competência e vigência do contrato;
- reajuste usa o mesmo motor compartilhado de projeção;
- alterações relevantes recalculam obrigações futuras/abertas;
- itens `pago` e `estornado` são preservados;
- obrigação antiga ainda em aberto não deve ser cancelada só porque saiu da janela de geração;
- itens futuros podem ser ajustados/cancelados quando o contrato deixar de gerar obrigação.

## Correção

A correção operacional deve preservar histórico. Não existe delete físico comum de obrigação.

Ações administrativas seguem:
- senha do Administrador logado;
- motivo obrigatório;
- auditoria;
- preservação de estados relevantes.

## Integrações proibidas por padrão

Sem decisão arquitetural explícita, Contas a Pagar não deve:
- lançar DRE;
- lançar Budget;
- lançar Forecast;
- criar Fluxo de Caixa;
- alterar contrato de origem.

## Navegação

Mover o item para dentro de Controladoria foi somente mudança visual. Não renomear coleção ou permissão para `controladoria.contasPagar`.