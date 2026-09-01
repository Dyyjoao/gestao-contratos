# SIG — Dossiê de Continuidade do Projeto

**Sistema Integrado de Gestão (SIG)**  
**Baseline funcional:** 01/09/2026 — Plano de Contas v6 + Balanço gerencial + Consórcios v1  
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
7. `app.js`;
8. `js/controllership-router.js`;
9. `firestore.rules`, `storage.rules`, `firebase.json` e `.firebaserc`;
10. `.github/workflows/`.

**Regra de ouro:** conversa ou memória de IA nunca são a única fonte de verdade. Para a Controladoria, `js/controllership-router.js` define quais módulos estão ativos.

---

# 1. Visão do produto

O SIG é uma camada empresarial de operação, controle e decisão. Deve evoluir como arquitetura integrada, não como coleção de telas isoladas.

Escopo ativo principal:

- Dashboard e Minha Mesa;
- Contratos;
- Controladoria & FP&A;
- Governança & Compliance;
- Administração de grupo, empresas, usuários e perfis.

Módulos operacionais antigos podem continuar fisicamente no repositório por histórico, mas não são ativos sem import/rota explícita.

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

Consórcios pode ser consultado em contexto multiempresa para visão de carteira, mas novo cadastro exige exatamente uma empresa selecionada.

---

# 3. Controladoria & FP&A — módulos ativos

A rota vigente está em `js/controllership-router.js`.

- DRE Gerencial — `js/ctrl-dre-v6.js`;
- Balanço Patrimonial — `js/ctrl-balance-sheet-v1.js`;
- Input Mensal — `js/ctrl-input-v6.js`;
- Budget — `js/ctrl-budget-v7.js`;
- Forecast — `js/ctrl-forecast-v5.js`;
- Fluxo de Caixa — `js/cashflow.js`;
- Prestação de Contas — `js/accountability.js`;
- Cockpit de Fechamento — `js/closing-v3.js`;
- Permutas — `js/permutas.js`;
- Premissas — `js/ctrl-premises-v4.js`;
- Imobilizado & CAPEX — `js/ctrl-assets-v1.js`;
- Consórcios — `js/ctrl-consorcios-v1.js`;
- Plano de Contas — `js/ctrl-chart-accounts-v6.js`;
- Centros de Custo — `js/ctrl-cost-centers-v2.js`;
- Configurações — `js/ctrl-settings.js`.

`fpa.js` e gerações anteriores não são fonte de verdade da Controladoria atual.

## 3.1 Permissões explícitas

Além de `controladoria.visualizar`, submódulos sensíveis possuem ações próprias.

- `controladoria.dre` — visualizar DRE;
- `controladoria.balanco` — visualizar Balanço;
- `controladoria.consorciosVisualizar` — consultar Consórcios;
- `controladoria.consorciosEditar` — criar/editar Consórcios.

DRE/Balanço preservam fallback temporário para perfis legados sem as novas chaves. Consórcios não possui fallback legado e exige permissão explícita ou Administração FP&A.

---

# 4. Plano de Contas v6

## 4.1 Máscara canônica

A máscara vigente é:

`#.##.##.####`

A hierarquia é obrigatoriamente:

1. **Raiz** — `1`, `2`, `3`, `4` ou `9`;
2. **Sintética N1** — `#.##`;
3. **Sintética N2** — `#.##.##`;
4. **Analítica** — `#.##.##.####`.

Exemplo patrimonial:

- `1` — ATIVO;
- `1.01` — ATIVO CIRCULANTE;
- `1.01.01` — DISPONIBILIDADES;
- `1.01.01.0001` — CAIXA.

A mesma estrutura é suportada nas raízes 1, 2, 3, 4 e 9 para manter um motor hierárquico único.

## 4.2 Raízes

- `1` Ativo — natureza padrão Devedora;
- `2` Passivo — natureza padrão Credora; Patrimônio Líquido deve ser estruturado abaixo desta raiz;
- `3` Receita — natureza padrão Credora;
- `4` Despesa — natureza padrão Devedora;
- `9` Estatística — natureza Neutra.

## 4.3 Regras de estrutura

- somente Analíticas recebem lançamentos;
- Sintéticas existem para organização e consolidação;
- relação hierárquica persistida por `contaPaiId`;
- novos cadastros usam `versaoMascara: "v6"` e `mascaraPlano: "#.##.##.####"`;
- geração de código é automática dentro do pai;
- a árvore do Plano é expansível/recolhível pelas setas;
- o Plano oferece filtro de contas Ativas, Inativas e Todas.

## 4.4 Inativação e reativação

Inativação é histórica por exercício por meio de `inativaAPartirExercicio`.

Uma conta/ramo só pode ser inativado depois da verificação de uso atual/futuro em Realizado, Budget, Forecast, detalhamentos, Premissas, Imobilizado/CAPEX e demais vínculos controlados pelo módulo.

Quando a conta está inativa, a ação correspondente deve ser **Reativar**. Reativar remove a inativação programada (`inativaAPartirExercicio = 0`) e restaura `status: ativo`. Em Sintéticas, a ação abrange o ramo.

## 4.5 Exclusão

Exclusão física existe apenas para corrigir cadastro de teste/erro sem histórico. Antes de excluir, o frontend verifica referências nas bases contábeis e de planejamento conhecidas. Se existir referência, a exclusão é bloqueada e a conta deve ser inativada para preservar rastreabilidade.

A Rule de `planoContasGerencial` permite delete somente a quem possui `fpaPlano()` e acesso ao documento.

## 4.6 Legado v5 e testes

Contas anteriores à v6 não são migradas automaticamente. O Plano v6 identifica como **Legado/teste** os registros fora do contrato v6 e oferece limpeza segura.

---

# 5. Natureza contábil e multiplicadores

`js/account-mask.js` é a fonte única de natureza e sinais.

Saldos persistidos permanecem brutos. Multiplicadores são aplicados somente em apresentação e cálculo.

- Ativo padrão: Devedora, apresentação `+1`;
- Passivo padrão: Credora, apresentação `+1`;
- Receita padrão: Credora, resultado `+1`;
- Despesa padrão: Devedora, resultado `-1`;
- Estatística: Neutra, resultado `0`.

Conta com natureza oposta à raiz é redutora. Não inferir redutora pelo texto `(-)` do nome.

---

# 6. Centros técnicos

- Estatísticas: `__cc_estatistico__`;
- Balanço: `__cc_balanco__`.

Ativo/Passivo não dependem de Centro de Custo operacional. Estatísticas não compõem resultado financeiro.

A matriz de Centro de Custo trabalha por IDs de contas Analíticas e não depende da quantidade de segmentos da máscara.

---

# 7. Balanço Patrimonial

Balanço representa **posição de fechamento**, não fluxo. Meses não são somados entre si.

Na v6, o Balanço apresenta `Raiz → Sintética N1 → Sintética N2 → Analítica`.

Na consolidação multiempresa, Analíticas são consolidadas por código. Sintéticas podem ser reconstruídas pelos prefixos do código quando necessário. Contas patrimoniais legadas continuam participando da reconciliação até serem removidas com segurança.

Imobilizado integrado substitui o saldo manual das contas patrimoniais mapeadas.

Visões vigentes:

1. **Evolução mensal + fechamento:** mês isolado mostra a competência; trimestre mostra os três meses + `Total Tn`; ano mostra Jan–Dez + `Total Ano`. O total é sempre a posição do último mês do período, nunca soma dos meses.
2. **Comparativo anual:** posição do ano atual x `Last Year`, com `Variação R$` e `Variação %`. Ambos usam dezembro dos respectivos exercícios e a estrutura preserva contas vigentes no atual ou no ano anterior.

A primeira coluna tem largura delimitada para equilibrar descrição e valores.

---

# 8. DRE, Budget e Forecast

DRE utiliza somente raízes 3 e 4 para resultado financeiro. Balanço e Estatísticas não podem contaminar OPEX/Resultado.

DRE por Centro de Custo utiliza `contaPaiId` e suporta os dois níveis sintéticos. Na visão consolidada por código, a hierarquia v6 é reconstruída como N1 → N2 → Analítica.

Budget é anual e versionado. Forecast combina Realizado fechado com projeção futura. A versão válida é determinada por empresa, não globalmente.

Premissas são resolvidas por competência e vigência; premissa específica de Centro de Custo prevalece sobre corporativa quando aplicável.

---

# 9. Imobilizado & CAPEX

Coleção: `imobilizados`.

Integrações atuais:

- Balanço: custo do ativo e depreciação acumulada;
- Budget/Forecast: despesa de depreciação automática por Conta × CC.

Fim da vida útil não baixa o bem. Um bem totalmente depreciado continua patrimonialmente até `dataBaixa`.

O motor deve operar em **fail-closed**: se `imobilizados` estiver indisponível, cálculos dependentes não podem silenciosamente assumir lista vazia/zero.

CAPEX ainda não gera automaticamente desembolso no Fluxo de Caixa. O cadastro atual de CAPEX não equivale a uma versão histórica imutável de Budget.

---

# 10. Consórcios v1

Coleção: `consorcios`.

Objetivo: gestão operacional/financeira da carteira de consórcios sem gerar lançamentos automáticos nesta fase.

Cadastro vigente inclui:

- descrição, administradora, grupo, cota e categoria;
- status `ativo`, `contemplado`, `encerrado`, `cancelado`;
- datas de início, fim previsto, próximo vencimento e contemplação;
- carta contratada e carta atual/reajustada;
- índice/critério de reajuste;
- prazo, parcelas pagas, valor da parcela atual e valor pago acumulado;
- taxa de administração, fundo de reserva, seguro/outros e juros/encargos opcionais;
- modalidade de contemplação, lance, crédito utilizado e bem/finalidade.

`js/consortium-calculations.js` centraliza a matemática:

- base = carta atual, ou contratada quando a atual não foi informada;
- taxa do consórcio = administração + fundo de reserva + seguro/outros;
- juros/encargos são separados da taxa do consórcio;
- total estimado = carta base + custos informados;
- parcela média = total estimado / prazo;
- saldo teórico usa valor pago acumulado quando disponível, senão usa parcela média × parcelas restantes;
- parcela atual real permanece separada da média estimada.

A tela apresenta KPIs de carteira ativa, contemplados, crédito atual, parcela mensal e saldo teórico. Consulta pode consolidar empresas selecionadas; cadastro novo é monoempresa.

**Decisão arquitetural:** Consórcios v1 não alimenta DRE, Balanço, Fluxo de Caixa, Budget, Forecast ou Imobilizado. Integração futura exige desenho contábil próprio antes de qualquer automação.

Não há delete físico em `consorcios`; usar Encerrado/Cancelado para preservar histórico.

---

# 11. Persistência e Firebase

Arquivo versionado de regras: `firestore.rules`.

Mudanças desta baseline que exigem Rules publicadas no Firebase:

1. coleção `imobilizados` com leitura/escrita por permissões de Controladoria;
2. `delete` em `planoContasGerencial` autorizado somente por `fpaPlano()` e `documentoAcessivel(resource.data)`;
3. coleção `consorcios`, com leitura por `consorciosVisualizar`/`consorciosEditar`, escrita por `consorciosEditar`, sempre limitada a grupo/empresa e sem delete.

O release só está completo quando frontend e Rules compatíveis estiverem publicados.

---

# 12. QA e release

Workflows relevantes:

- `SIG Quality Check`;
- `SIG Firebase Contract Check`;
- `SIG Permissions Contract Check`;
- `SIG Consorcios Contract Check`;
- GitHub Pages build/deploy.

O QA deve verificar, no mínimo:

- sintaxe de todos os JS;
- imports dos módulos atuais;
- `abrir()` real de módulos críticos em navegador headless;
- rota ativa do Plano v6 e Consórcios v1;
- máscara `#.##.##.####` e hierarquia;
- filtro/reação de inativação/reativação;
- exclusão segura de contas;
- Balanço/DRE adaptados à hierarquia;
- matemática e permissões de Consórcios;
- contrato de Firestore Rules.

Não promover pacote estrutural pela metade.

---

# 13. Limitações e decisões abertas

- exclusão de conta é ferramenta de limpeza, não política de retenção de histórico;
- contas v5 não são migradas automaticamente para v6;
- migração futura de histórico deve ser projeto separado, com rollback;
- baixa/venda de ativo ainda não fecha automaticamente ganho/perda de alienação na DRE;
- CAPEX ainda não integra desembolso de caixa automaticamente;
- Consórcios ainda não integra automaticamente demonstrativos, caixa ou planejamento;
- cálculo de Consórcios é gerencial e depende dos percentuais/valores contratuais informados; reajustes reais devem ser atualizados na carta/parcela atual;
- módulos legados no repositório não devem ser reativados sem decisão explícita.

---

## Estado desta baseline

A arquitetura vigente combina Plano de Contas v6, Balanço com visão evolutiva e comparativo anual, permissões modulares e Consórcios v1 independente. A publicação definitiva de uma versão que altere `firestore.rules` exige QA verde, promoção do frontend e republicação das Firestore Rules compatíveis no Firebase.