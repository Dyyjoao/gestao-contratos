# Contas a Pagar — Cockpit operacional

## Objetivo

Módulo independente para controle de compromissos e pagamentos fixos. Não grava, soma nem sincroniza valores em DRE, Budget, Forecast ou Realizado.

## Fontes

- Manual: conta avulsa ou recorrência mensal criada no próprio cockpit.
- Contrato: contrato ativo com a opção `Enviar ao Contas a Pagar`, valor mensal e dia de pagamento válidos.

## Cockpit

- vencidos;
- vence hoje;
- próximos 7 dias;
- próximos 30 dias;
- pagos no período;
- filtros por status, origem, período e busca.

## Fluxo de pagamento

- conta aberta pode ser baixada como paga por perfil autorizado;
- contas manuais abertas podem ser editadas;
- obrigações originadas em Contratos têm valor/vigência editados no contrato, evitando dupla fonte de verdade;
- estorno e reabertura são correções administrativas, exigem Administrador, reautenticação, motivo e auditoria;
- não existe exclusão física na coleção `contasPagar`.

## Integração com Contratos

A opção `Enviar ao Contas a Pagar` é independente das opções de FP&A/Fluxo de Caixa. O sincronizador cria competências mensais no horizonte operacional, preserva pagamentos já baixados e cancela automaticamente apenas obrigações futuras ainda abertas quando o contrato deixa de gerar a obrigação.

## Minha Mesa

A Minha Mesa recebe um card próprio de Contas a Pagar com vencidos, vencimentos de hoje e próximos 7 dias, além da lista das obrigações mais urgentes e atalho para abrir o cockpit já filtrado.

## Segurança

Permissões próprias: visualizar, cadastrar, editar e baixar. Firestore Rules isolam Grupo/Empresa. Exclusão física é bloqueada. Correções administrativas são auditáveis.