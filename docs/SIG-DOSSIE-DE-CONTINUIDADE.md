# SIG — Dossiê de Continuidade do Projeto

**Sistema Integrado de Gestão (SIG)**  
**Baseline funcional:** 02/09/2026 — Plano v6 + Balanço + Consórcios + Permutas v2 + Governança/Antifraude + Inadimplência + Dashboard v2 + Vendas  
**Repositório:** `Dyyjoao/gestao-contratos`  
**Produção:** `main`

---

## 0. Fonte de verdade

Este documento registra o estado funcional consolidado do SIG. O código executável e as Rules publicadas são a prova final do comportamento vigente.

Ordem recomendada de leitura:

1. `AGENTS.md`;
2. este Dossiê;
3. `docs/SIG-MANUAL-MESTRE.md`;
4. `docs/SIG-GUIA-DE-CONTINUIDADE.md`;
5. `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`;
6. `SECURITY.md`;
7. `docs/dashboard-v2-vendas.md` para Dashboard/Vendas;
8. `app.js`;
9. `js/controllership-router.js`;
10. `js/profiles.js`;
11. `firestore.rules`, `storage.rules`, `firebase.json` e `.firebaserc`;
12. `.github/workflows/`.

**Regra de ouro:** conversa ou memória de IA nunca são a única fonte de verdade. Para a Controladoria, `js/controllership-router.js` define quais módulos estão ativos.

---

# 1. Visão do produto

O SIG é uma camada empresarial de operação, controle, governança e decisão. Deve evoluir como arquitetura integrada, não como coleção de telas isoladas.

Escopo ativo principal:

- Dashboard Gerencial e Minha Mesa;
- Contratos;
- Consórcios;
- Permutas;
- Vendas & Comissões;
- Controladoria & FP&A;
- Governança & Compliance, incluindo Antifraude & TI;
- Planos de Ação;
- Administração de grupo, empresas, usuários e perfis.

Módulos operacionais antigos podem continuar fisicamente no repositório por histórico, mas não são ativos sem import/rota explícita.

**Regra estrutural:** nova tela/módulo deve nascer com menu/rota, grid de Perfis, bloqueio real de ação, Rules quando houver dados, QA e documentação.

---

# 2. Arquitetura de execução

## 2.1 Frontend e backend

- frontend estático/PWA em HTML, CSS e JavaScript;
- Firebase Authentication para autenticação;
- Cloud Firestore para persistência;
- Firebase Storage para anexos cobertos por Rules;
- GitHub Pages para hospedagem do frontend.

**GitHub Pages e Firebase Rules são deploys independentes.** Alterar `firestore.rules` no Git não publica a Rule no Firebase.

## 2.2 Contexto empresarial

Toda persistência empresarial deve respeitar:

- `grupoId`;
- `empresaId` quando aplicável;
- empresa(s) selecionada(s) no cabeçalho;
- permissões do perfil.

Telas monoempresa não podem escolher silenciosamente a primeira empresa de um contexto múltiplo. Fluxo de Caixa e Prestação de Contas exigem exatamente uma empresa.

Carteiras gerenciais como Consórcios, Permutas, Inadimplência, Dashboard e Vendas podem consolidar empresas quando o módulo tiver sido desenhado para isso; cadastros pertencentes a uma empresa exigem contexto inequívoco.

---

# 3. Navegação e permissões

Módulos de primeiro nível relevantes na baseline:

- Dashboard;
- Contratos;
- Consórcios;
- Permutas;
- Vendas & Comissões;
- Controladoria & FP&A;
- Governança & Compliance;
- Administração conforme autorização.

Consórcios, Permutas e Vendas são independentes da Controladoria e não devem aparecer no submenu de FP&A.

Perfis são definidos em `js/profiles.js`. Ocultar menu não substitui autorização. O roteador também deve bloquear abertura e as Rules devem proteger persistência/leitura quando necessário.

---

# 4. Controladoria & FP&A — módulos ativos

A rota vigente está em `js/controllership-router.js`.

- DRE Gerencial — `js/ctrl-dre-v6.js`;
- Balanço Patrimonial — `js/ctrl-balance-sheet-v1.js`;
- Inadimplência & Aging — `js/ctrl-delinquency-v1.js`;
- Input Mensal — `js/ctrl-input-v6.js`;
- Budget — `js/ctrl-budget-v7.js`;
- Forecast — `js/ctrl-forecast-v5.js`;
- Fluxo de Caixa — `js/cashflow.js`;
- Prestação de Contas — `js/accountability.js`;
- Cockpit de Fechamento — `js/closing-v3.js`;
- Premissas — `js/ctrl-premises-v4.js`;
- Imobilizado & CAPEX — `js/ctrl-assets-v1.js`;
- Plano de Contas — `js/ctrl-chart-accounts-v6.js`;
- Centros de Custo — `js/ctrl-cost-centers-v2.js`;
- Configurações — `js/ctrl-settings.js`.

`fpa.js` e gerações anteriores não são fonte de verdade da Controladoria atual.

Permissões de DRE/Balanço são feature gates explícitos. Inadimplência possui consulta (`controladoria.inadimplencia`) e gestão (`controladoria.inadimplenciaEditar`) separadas.

---

# 5. Plano de Contas v6 e natureza

Máscara canônica: `#.##.##.####`.

Hierarquia:

1. Raiz — `1`, `2`, `3`, `4`, `9`;
2. Sintética N1 — `#.##`;
3. Sintética N2 — `#.##.##`;
4. Analítica — `#.##.##.####`.

Somente Analíticas recebem lançamento. `contaPaiId` é o vínculo estrutural persistido.

`js/account-mask.js` é a fonte única de natureza, raiz, conta redutora e multiplicadores. Saldo bruto nunca é regravado para corrigir apresentação.

Conta com histórico deve ser inativada. Exclusão física do Plano existe apenas para erro/teste sem referência, após varredura de dependências.

Centros técnicos:

- Estatísticas: `__cc_estatistico__`;
- Balanço: `__cc_balanco__`.

---

# 6. Balanço, DRE e planejamento

Balanço representa **posição de fechamento**, não fluxo. Meses não são somados entre si.

- trimestre = meses + posição final do trimestre;
- ano = Jan–Dez + posição de dezembro;
- comparativo anual = dezembro atual x dezembro Last Year.

DRE usa raízes 3 e 4 e `multiplicadorResultado`. Budget é anual/versionado. Forecast = Realizado fechado + projeção futura. Premissas respeitam vigência/competência.

`js/financial-reporting.js` concentra a base compartilhada usada por DRE, prestação e Dashboard para evitar fórmulas paralelas.

---

# 7. Imobilizado & CAPEX

Coleção: `imobilizados`.

Integrações atuais:

- Balanço: custo e depreciação acumulada;
- Budget/Forecast: despesa de depreciação automática por Conta × CC.

Fim da vida útil não baixa o bem. CAPEX ainda não gera desembolso automático no Caixa.

A coleção é crítica: falha de leitura deve operar em **fail-closed** nos cálculos dependentes.

---

# 8. Consórcios

Coleção: `consorcios`.

Módulo de primeiro nível após Contratos. A UI usa permissões próprias `consorcios.visualizar` e `consorcios.editar`; existe espelho técnico temporário para chaves legadas de Controladoria enquanto backend/roteador ainda exigirem compatibilidade.

`js/consortium-calculations.js` centraliza a matemática. Carta atual é base preferencial; taxas de administração/reserva/seguro ficam separadas de juros/encargos. Cronograma de parcelas é projeção, não histórico real.

**Consórcios não alimenta automaticamente DRE, Balanço, Caixa, Budget, Forecast ou Imobilizado.**

---

# 9. Permutas v2

Módulo operacional de primeiro nível após Consórcios.

Coleções:

- `permutas`;
- `permutaMovimentos`;
- `permutaFechamentos`.

Principais contratos:

- CPF/CNPJ usa helper padronizado do SIG;
- ficha individual e relatórios por intervalo exato de dias;
- estorno preserva lançamento riscado, motivo, usuário e data/hora;
- estorno não compõe saldo/fechamento;
- permuta inativa não aceita movimento novo;
- fechamento registra entradas, saídas, saldo e ciclo, podendo zerar ou carregar saldo para próximo ciclo;
- delete físico somente Administrador, com reautenticação pela senha;
- UI deve refletir exclusão imediatamente sem depender de reload completo.

---

# 10. Governança, Antifraude e Inadimplência

Governança & Compliance usa a estrutura de riscos, obrigações, programas/ciclos de auditoria e Planos de Ação.

O Cockpit Antifraude & TI concentra controles simples e executáveis: MFA, endpoint/antivírus, patches, bloqueio de tela, backups, credenciais/privilégios, phishing e validação independente de alterações financeiras. Achados podem gerar Plano de Ação.

Inadimplência usa coleção própria `inadimplenciaTitulos`, com aging e índice vencido/carteira em aberto. Consulta e gestão são segregadas. Delete físico é bloqueado.

---

# 11. Dashboard Gerencial v2

Implementação ativa:

- `js/dashboard-v2.js` — ponto de entrada;
- `js/dashboard-cockpit-v2.js` — cockpit;
- `dashboard-v2.css` — layout.

O dashboard deixou de ser um resumo fixo de DRE + Caixa e passa a ser **cockpit configurável por usuário**.

Princípios:

- não usar “Atalhos de Gestão”; o menu já cumpre esse papel;
- cada KPI relevante deve trazer comparação/tendência/meta quando possível;
- visão resumida deve permitir drill-down para o módulo de origem;
- widgets só aparecem se o perfil possuir acesso à fonte;
- usuário pode exibir/ocultar e ordenar widgets;
- preferência fica em `dashboardPreferencias/{uid}` e só o próprio usuário pode acessá-la;
- Dashboard não é ledger nem fonte de lançamentos.

Blocos previstos/ativos: Resumo Executivo, Evolução de Resultado, Balanço, Caixa, Inadimplência, Consórcios, Permutas, Vendas & Comissões e desvios vs Budget.

A análise patrimonial usa posição de fechamento e comparação com Last Year, preservando o contrato do Balanço.

---

# 12. Vendas & Comissões

Módulo comercial de primeiro nível após Permutas. Não pertence à Controladoria.

Arquivos:

- `js/sales.js`;
- `js/sales-guard.js`;
- `js/sales-performance.js`;
- `sales.css`;
- `sales-performance.css`.

Coleções:

- `vendedores`;
- `vendas`.

Permissões:

- `vendas.visualizar`;
- `vendas.lancar`;
- `vendas.editar`;
- `vendas.vendedores`;
- `vendas.comissoes`.

Cadastro do vendedor define meta mensal, comissão padrão e **base da comissão**:

- `venda`: gera comissão sobre a venda confirmada;
- `faturamento`: gera comissão sobre o valor efetivamente faturado.

Faturamento parcial é permitido. A venda grava snapshot da regra (`baseComissao`, `comissaoPct`, `comissaoBaseValor`, `comissaoValor`, `comissaoStatus`) para impedir recálculo retroativo quando a regra do vendedor mudar.

Fluxo financeiro da comissão:

- aguardando faturamento;
- provisionada;
- aprovada;
- paga.

Quem possui apenas `vendas.lancar` não pode definir taxa/base divergente do cadastro do vendedor. `sales-guard.js` protege a UI e `firestore.rules` é a barreira efetiva.

Venda cancelada fica no histórico e sai dos totais. Delete físico de venda/vendedor é bloqueado; vendedor é inativado.

## 12.1 Performance comercial

O cockpit por vendedor mostra:

- barras Venda x Faturamento x Meta;
- atingimento;
- Faturado/Venda;
- ticket médio;
- comissão;
- líder e participação no total;
- maior atingimento;
- maior gap venda x faturamento;
- maior comissão.

Também gera leituras gerenciais como meta batida com faturamento pendente ou gap elevado. Clicar no vendedor filtra a carteira detalhada.

**Vendas não alimenta automaticamente DRE, Balanço, Caixa, Budget ou Forecast.** O Dashboard pode cruzar a leitura comercial com a financeira sem misturar fontes.

---

# 13. Persistência e Firebase

Arquivo versionado: `firestore.rules`.

Coleções/regras críticas desta baseline incluem:

- `imobilizados`;
- `planoContasGerencial`;
- `consorcios`;
- `permutas`, `permutaMovimentos`, `permutaFechamentos`;
- `inadimplenciaTitulos`;
- `dashboardPreferencias`;
- `vendedores`;
- `vendas`.

Dashboard Preferences é por UID. Vendedores/Vendas respeitam grupo/empresa e permissões comerciais. Rules validam o contrato da comissão e bloqueiam delete físico.

O release só está completo quando frontend e Rules compatíveis estiverem publicados.

---

# 14. QA e release

Workflows relevantes:

- `SIG Quality Check`;
- `SIG Firebase Contract Check`;
- `SIG Permissions Contract Check`;
- `SIG Consorcios Contract Check`;
- `SIG Permutas Contract Check`;
- contrato específico Dashboard/Vendas quando presente;
- GitHub Pages build/deploy.

O QA deve verificar sintaxe, rotas ativas, permissões, Rules, cálculo e browser smoke dos módulos alterados. Não promover pacote estrutural pela metade.

---

# 15. Limitações e decisões abertas

- contas v5 não são migradas automaticamente para v6;
- baixa/venda de ativo ainda não fecha automaticamente ganho/perda na DRE;
- CAPEX ainda não integra desembolso de caixa automaticamente;
- Consórcios ainda não integra demonstrativos, caixa ou planejamento;
- Permutas continua independente da contabilidade automática;
- Vendas ainda não gera lançamento de Receita/Contas a Receber/DRE automaticamente;
- faturamento comercial é registrado no módulo de Vendas, não substitui integração fiscal/ERP;
- Dashboard cruza fontes mas não cria nova fonte de verdade;
- módulos legados no repositório não devem ser reativados sem decisão explícita.

---

## Estado desta baseline

A baseline combina Controladoria modular, gestão operacional independente, Governança/Antifraude, Inadimplência, Dashboard Gerencial configurável e Vendas & Comissões com segregação de acesso. Qualquer release que altere `firestore.rules` exige QA verde, promoção do frontend e republicação da Rule completa correspondente ao SHA de produção no Firebase.
