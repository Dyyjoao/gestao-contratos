# Release — Controladoria & FP&A

Checklist de promoção para `main`.

> **Regra de release desde 01/09/2026:** publicar o frontend no GitHub Pages **não publica** `firestore.rules` nem `storage.rules`. Quando uma versão alterar regras, coleções ou permissões, o release só está completo depois do deploy das Rules no Firebase e de um teste autenticado em produção.

## Antes do merge

- [ ] branch comparada com `main`;
- [ ] todos os módulos novos/alterados estão completos;
- [ ] `js/controllership-router.js` aponta somente para versões atuais aprovadas;
- [ ] atalhos de Configurações não abrem módulos antigos;
- [ ] documentação oficial está atualizada;
- [ ] `SECURITY.md`, `firestore.rules` e `storage.rules` foram revisados quando necessário;
- [ ] `firebase.json` referencia `firestore.rules` e `storage.rules`;
- [ ] `.firebaserc` aponta para o projeto Firebase correto;
- [ ] toda coleção nova usada pelo frontend possui regra explícita antes da promoção;
- [ ] integrações contábeis críticas falham de forma fechada: indisponibilidade de uma base automática não pode ser convertida silenciosamente em `[]` ou zero;
- [ ] QA automático está verde;
- [ ] casos contábeis críticos do `docs/qa-controladoria-modular.md` foram verificados;
- [ ] nenhuma migração destrutiva foi introduzida sem rollback;
- [ ] não há necessidade de alterar saldo bruto para corrigir apresentação;
- [ ] telas monoempresa bloqueiam contexto múltiplo;
- [ ] legado conhecido permanece preservado ou foi removido com prova de não dependência.

## Promoção do frontend

Preferir fast-forward quando o histórico permitir.

Não publicar pacote estrutural pela metade. Se um módulo depende de outra mudança da mesma branch para manter integridade, promover o conjunto somente depois de QA completo.

A promoção da `main` dispara o GitHub Pages e publica HTML/CSS/JavaScript. **Ela não substitui o deploy Firebase descrito abaixo.**

## Deploy das Rules do Firebase

Quando `firestore.rules`, `storage.rules`, `firebase.json` ou o modelo de permissões tiver mudado:

1. confirmar que `.firebaserc` aponta para `gestao-de-contratos-b266b`;
2. revisar o diff das Rules antes do deploy;
3. autenticar a Firebase CLI com uma conta autorizada;
4. executar, a partir da raiz do repositório:
   - `firebase deploy --only firestore:rules,storage`;
5. confirmar que o deploy concluiu sem erro;
6. sair e entrar novamente no SIG se o perfil/permissão tiver mudado;
7. testar a coleção/fluxo novo com usuário real de produção;
8. só então considerar a release concluída.

Não armazenar token, service account ou credenciais Firebase no repositório.

## Depois do merge / deploy

- [ ] acompanhar `SIG Quality Check` da `main`;
- [ ] acompanhar deploy do frontend;
- [ ] se Rules mudaram, confirmar deploy separado no Firebase;
- [ ] validar login e contexto de empresa;
- [ ] validar Input Mensal;
- [ ] validar Balanço;
- [ ] validar DRE;
- [ ] validar Budget/Forecast;
- [ ] validar Imobilizado/CAPEX e leitura da coleção `imobilizados`;
- [ ] validar depreciação automática em Balanço, Input, Budget, Forecast e DRE;
- [ ] validar que falha de leitura de `imobilizados` bloqueia os cálculos automáticos em vez de assumir zero;
- [ ] validar Dashboard;
- [ ] validar Fluxo de Caixa em empresa única e bloqueio multiempresa;
- [ ] validar Prestação de Contas em empresa única e bloqueio multiempresa;
- [ ] confirmar console sem erro crítico;
- [ ] forçar recarga de cache quando necessário.

## Rollback

Rollback de frontend deve apontar para commit estável anterior e **não apagar dados**.

Rules e frontend possuem ciclos de deploy independentes. Se o frontend for revertido, conferir se as Rules continuam compatíveis com a versão restaurada antes de revertê-las também.

Se houver problema após deploy:

1. identificar se é cache, frontend, Rules ou dado;
2. preservar evidências;
3. reverter frontend quando apropriado;
4. reverter Rules apenas para uma versão conhecida e compatível, se necessário;
5. não modificar Firestore em massa para mascarar erro visual;
6. aplicar migração de dados somente se o modelo realmente exigir.
