# Release — Controladoria & FP&A

Checklist de promoção para `main`.

## Antes do merge

- [ ] branch comparada com `main`;
- [ ] todos os módulos novos/alterados estão completos;
- [ ] `js/controllership-router.js` aponta somente para versões atuais aprovadas;
- [ ] atalhos de Configurações não abrem módulos antigos;
- [ ] documentação oficial está atualizada;
- [ ] `SECURITY.md` e Rules foram revisados quando necessário;
- [ ] QA automático está verde;
- [ ] casos contábeis críticos do `docs/qa-controladoria-modular.md` foram verificados;
- [ ] nenhuma migração destrutiva foi introduzida sem rollback;
- [ ] não há necessidade de alterar saldo bruto para corrigir apresentação;
- [ ] telas monoempresa bloqueiam contexto múltiplo;
- [ ] legado conhecido permanece preservado ou foi removido com prova de não dependência.

## Promoção

Preferir fast-forward quando o histórico permitir.

Não publicar pacote estrutural pela metade. Se um módulo depende de outra mudança da mesma branch para manter integridade, promover o conjunto somente depois de QA completo.

## Depois do merge

- [ ] acompanhar `SIG Quality Check` da `main`;
- [ ] acompanhar deploy do frontend;
- [ ] validar login e contexto de empresa;
- [ ] validar Input Mensal;
- [ ] validar Balanço;
- [ ] validar DRE;
- [ ] validar Budget/Forecast;
- [ ] validar Imobilizado automático;
- [ ] validar Dashboard;
- [ ] validar Fluxo de Caixa em empresa única e bloqueio multiempresa;
- [ ] validar Prestação de Contas em empresa única e bloqueio multiempresa;
- [ ] confirmar console sem erro crítico;
- [ ] forçar recarga de cache quando necessário.

## Rollback

Rollback de frontend deve apontar para commit estável anterior e **não apagar dados**.

Se houver problema após deploy:

1. identificar se é cache, frontend, Rules ou dado;
2. preservar evidências;
3. reverter frontend quando apropriado;
4. não modificar Firestore em massa para mascarar erro visual;
5. aplicar migração de dados somente se o modelo realmente exigir.