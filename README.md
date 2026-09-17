# SIG — Sistema Integrado de Gestão

WebApp/PWA empresarial para operação, comercial, controladoria, governança e decisão gerencial.

> **Documentação revisada em:** 16/09/2026  
> **Produção:** `main`  
> **Firebase:** `gestao-de-contratos-b266b`  
> **Baseline vigente:** `docs/SIG-BASELINE-ATUAL.md`

## Arquitetura atual

`Web/PWA → Firebase Authentication → Cloud Firestore`

GitHub continua como repositório e fluxo de release. Firebase Storage permanece adiado/não ativo para a operação atual. Banco local, VPN obrigatória, domínio multi-tenant e app nativo são possibilidades futuras, não decisões já aplicadas.

## Navegação atual

### Comercial
- Vendas & Comissões

### Controladoria & FP&A
Além dos módulos nativos, aparecem visualmente dentro da área:
- Contratos
- Contas a Pagar
- Permutas
- Consórcios

A mudança é apenas de navegação. Cada módulo mantém permissões, coleções e regras próprias.

### Operação
A migração do sistema atual em Apps Script começou por **Produção**, ainda em homologação no PR #30. Produção só será considerada ativa após preview, aprovação, Rules e merge.

## Controladoria

Módulos ativos incluem DRE Gerencial, Balanço, Input Mensal, Budget, Forecast, Fluxo de Caixa, Prestação de Contas, Cockpit de Fechamento, Premissas, Imobilizado & CAPEX, Plano de Contas, Centros de Custo e Configurações.

A DRE vigente possui:
- DRE Gerencial principal;
- detalhamento de contas;
- estrutura do plano;
- DRE Societária · CPC 51;
- totalizadores calculados.

## Contratos

Contratos podem alimentar Budget/Forecast, Contas a Pagar e provisões de Caixa quando as flags e parametrizações estiverem ativas. Reajustes usam motor compartilhado e alterações relevantes devem reconciliar competências futuras/abertas sem sobrescrever estados históricos protegidos.

## Contas a Pagar

Cockpit operacional independente de DRE/Budget/Forecast/Caixa. Pode ser alimentado por Contratos e mantém conta bancária planejada no lançamento, com conta efetiva no pagamento conforme permissão.

## Migração do Script

O sistema em Google Apps Script é fonte de requisitos, regras, dados e indicadores. O SIG continua sendo referência de UX.

Migração por tela:

`análise → implementação em branch → CI → preview → homologação → ajustes → aprovação → merge`

Inventário e andamento: `docs/migracao-script-sig.md`.

## Segurança e governança

- Grupo/Empresa são fronteiras de segurança;
- esconder botão não substitui Rule;
- toda alteração de `firestore.rules` exige publicação separada no Firebase;
- estorno é a correção padrão;
- exclusão física é excepcional, Administrador + reautenticação + motivo + auditoria;
- `auditoriaAdministrativa` é append-only.

## Documentação canônica

- `docs/SIG-BASELINE-ATUAL.md` — estado atual e decisões vigentes;
- `docs/SIG-MANUAL-MESTRE.md` — invariantes;
- `docs/SIG-DOSSIE-DE-CONTINUIDADE.md` — continuidade técnica;
- `docs/SIG-GUIA-DE-CONTINUIDADE.md` — retomada operacional;
- `docs/SIG-FIREBASE-DEPLOY-E-RULES.md` — deploy e Rules;
- `docs/SIG-CORRECOES-ADMINISTRATIVAS.md` — estorno/exclusão/auditoria;
- `docs/migracao-script-sig.md` — migração do Script para o SIG.

Se houver conflito com documento histórico antigo, prevalece a baseline atual e o código efetivamente mergeado em `main`.