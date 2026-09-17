# SIG — Dossiê de Continuidade do Projeto

**Sistema:** Sistema Integrado de Gestão (SIG)  
**Baseline:** 16/09/2026  
**Repositório:** `Dyyjoao/gestao-contratos`  
**Produção:** `main`  
**Documento-base:** `docs/SIG-BASELINE-ATUAL.md`

## 0. Como retomar o projeto

Ler nesta ordem:
1. `docs/SIG-BASELINE-ATUAL.md`;
2. `docs/SIG-MANUAL-MESTRE.md`;
3. este Dossiê;
4. `docs/SIG-GUIA-DE-CONTINUIDADE.md`;
5. `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`;
6. `app.js`;
7. `js/controllership-router.js`;
8. `js/profiles.js`;
9. `firestore.rules`;
10. `.github/workflows/`.

PR aberto não é produção. Conversa não é fonte única de verdade.

## 1. Estado atual de navegação

PR #29 foi mergeado em `main` e reorganizou a navegação por áreas.

### Comercial
- Vendas & Comissões.

### Controladoria & FP&A
Visualmente contém, antes dos módulos nativos:
- Contratos;
- Contas a Pagar;
- Permutas;
- Consórcios.

Apenas a navegação mudou. Os módulos continuam independentes em permissão, persistência e regras.

## 2. Estado atual da Controladoria

Rota vigente: `js/controllership-router.js`.

Módulos nativos:
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

## 3. DRE restaurada

A arquitetura aprovada foi restaurada no merge do PR #28:
- DRE Gerencial principal;
- detalhamento de contas;
- estrutura do plano;
- visualização societária CPC 51;
- totalizadores calculados.

O Plano classifica contas de resultado para Linha DRE Gerencial e Categoria CPC 51. Totalizadores não são contas lançáveis.

## 4. Contratos + FP&A + Caixa

O sincronizador de Contratos usa conta Analítica de Resultado válida, Centro de Custo permitido, vigência, dia de vencimento e regra de reajuste.

Contrato pode alimentar:
- Budget/Forecast quando planejamento estiver ativo;
- Contas a Pagar quando aplicável;
- provisões de Caixa quando `fluxoCaixaAtivo` estiver ativo.

O motor de reajuste é compartilhado. O percentual/referência é informado no contrato; não existe busca externa automática de IPCA/IGP-M.

Mudanças de regra, vigência ou renovação devem reconciliar posições futuras/abertas e preservar estados históricos protegidos. Se isso não ocorrer em algum caso, tratar como defeito, não como nova regra.

## 5. Contas a Pagar

Cockpit operacional independente de FP&A.

- Contratos podem gerar obrigações;
- reajuste de contrato recalcula obrigações futuras/abertas;
- pagos e estornados são preservados;
- obrigação histórica em aberto não deve ser cancelada só por sair da janela atual;
- conta bancária planejada é definida no lançamento;
- conta efetiva pode ser registrada na baixa conforme autorização;
- filtros e impressão usam a conta bancária;
- não há geração automática de DRE, Budget, Forecast ou Fluxo de Caixa.

## 6. Correções administrativas

Helpers centrais:
- `js/admin-actions.js`;
- `js/input-admin-actions.js`;
- `js/master-admin-actions.js`;
- `js/workflow-admin-actions.js`;
- `js/fleet-admin-actions.js`;
- `js/cashflow-admin-actions.js`.

Regra permanente: estorno auditável como caminho normal; exclusão física apenas excepcional e Administrador + senha + motivo + auditoria.

## 7. Firebase e Storage

Firebase Authentication + Firestore continuam como backend vigente.

- Firestore Rules e frontend têm deploys independentes;
- Storage continua adiado/não ativo;
- não afirmar que Storage está operacional;
- opção de banco local/API própria continua em estudo e não deve ser implementada sem aprovação;
- integrações/bases críticas devem operar em **fail-closed**: falha de leitura não pode virar zero, lista vazia ou autorização implícita.

## 8. Migração do sistema Script

Objetivo: substituir gradualmente o sistema em Apps Script e concentrar os controles no SIG.

Diretriz:
- preservar dados, regras e indicadores úteis;
- redesenhar a UX no padrão SIG;
- transformar listas hardcoded em cadastros mestres quando fizer sentido;
- expor KPIs relevantes ao Dashboard;
- migrar tela por tela.

Inventário identificado:
- Operação: Produção, Descarte;
- Comercial: Vendedor, Consolidado de Vendas, Material, Visitas, Reclamações, Orçamentos;
- Logística: Entrega/Recolhimento de Pallets, Inventário de Pallets;
- Frota: Abastecimento, Gestão de Veículos, Consumo Diesel;
- Financeiro: Financeiro, Custo de EPI;
- RH: Hora Extra, Quadro de Funcionários, Ativos por Setor, Ativos no Mês;
- Segurança: Segurança, Treinamentos;
- Manutenção: Ordem de Serviço.

O sistema legado usa Google Sheets como persistência e `CacheService` para desempenho.

## 9. Primeira tela da migração

PR #30: **Operação · Produção v1**.

Estado: homologação, sem merge em `main`.

Escopo previsto:
- Data;
- Produção/Máquina;
- Quantidade;
- Horas trabalhadas;
- Produção por hora;
- Item;
- Concretador;
- cadastros operacionais;
- KPIs e gráficos;
- histórico com estorno ADM.

Rules de Produção ainda não fazem parte da baseline publicada. Não usar a tela como produção real até aprovação, Rules e merge.

## 10. Preview-first

Fluxo de entrega:

`branch → CI → preview isolado → teste do usuário → ajustes → aprovação → merge → produção`

Pendente estrutural: configurar preview navegável por PR, preferencialmente via Firebase Hosting Preview Channels, sem usar `main` como ambiente de homologação.

## 11. Pontos ainda pendentes

- issue de conta legada do Plano bloqueada por referências invisíveis/orfãs ainda precisa de diagnóstico específico;
- Storage permanece adiado;
- preview automatizado ainda precisa ser configurado;
- banco local/VPN/domínio/app nativo não são arquitetura aprovada;
- migração do Script seguirá tela por tela durante o ciclo atual.

## 12. Regra de continuidade

Nenhuma diretriz funcional, arquitetural ou de governança pode ser alterada silenciosamente. Melhorias podem ser propostas, mas só viram regra após aprovação explícita.