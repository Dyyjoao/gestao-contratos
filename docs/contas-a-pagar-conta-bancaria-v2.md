# SIG — Contas a Pagar · Conta Bancária

**Atualizado em:** 16/09/2026

## Regra vigente

A conta bancária faz parte do compromisso desde o lançamento e também da baixa.

### Lançamento
- compromisso manual novo deve receber conta bancária planejada;
- obrigações geradas por Contratos recebem a conta planejada configurada no contrato quando disponível;
- registros legados sem conta são preservados como `Sem conta vinculada`.

### Baixa
- a conta planejada é sugerida;
- a conta efetiva de pagamento pode divergir conforme permissão vigente/ação administrativa;
- o histórico deve preservar a conta realmente utilizada no pagamento.

### Filtro e impressão
- contas em aberto usam a conta planejada;
- contas pagas usam a conta efetiva;
- filtro por conta bancária deve afetar a listagem e a impressão.

## Limite arquitetural

A conta bancária em Contas a Pagar é informação operacional do cockpit. Ela **não cria automaticamente lançamento no Fluxo de Caixa**.

Qualquer integração AP → Caixa exige decisão explícita.

## Navegação

Contas a Pagar aparece dentro de Controladoria & FP&A, mas continua usando módulo/permissões próprios `contasPagar`.