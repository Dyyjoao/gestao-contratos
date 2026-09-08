# SIG — Sistema Integrado de Gestão

WebApp/PWA empresarial voltado a **operação, controladoria, governança e decisão gerencial**, com frontend modular em JavaScript e backend gerenciado por Firebase Authentication + Cloud Firestore.

> **Documentação revisada em:** 08/09/2026  
> **Baseline executável de produção:** `main` @ `76f4fabeed2eb893868db6a5a1b65551f1a058fe`  
> **Projeto Firebase:** `gestao-de-contratos-b266b`

O SIG não deve evoluir como uma coleção de telas isoladas. Cada módulo novo precisa nascer integrado à navegação, permissões, Rules, QA e documentação, preservando a separação entre **fonte operacional**, **fonte contábil/gerencial** e **visões executivas**.

---

## Visão do produto

O SIG combina quatro camadas:

1. **Operação** — Contratos, Consórcios, Permutas, Vendas & Comissões e outros fluxos operacionais;
2. **Controladoria & FP&A** — DRE, Balanço, Budget, Forecast, Caixa, Fechamento, Inadimplência e estruturas gerenciais;
3. **Governança & Compliance** — riscos, obrigações, auditorias, Antifraude & TI e Planos de Ação;
4. **Gestão executiva** — Dashboard Gerencial configurável e Minha Mesa.

O Dashboard cruza informações de várias fontes, mas **não se torna uma nova fonte contábil ou operacional**.

---

## Escopo ativo

### Gestão e navegação principal

- **Dashboard Gerencial v2**;
- **Minha Mesa**;
- **Contratos**;
- **Consórcios**;
- **Permutas**;
- **Vendas & Comissões**;
- **Controladoria & FP&A**;
- **Governança & Compliance**;
- **Planos de Ação**;
- **Administração** de grupo empresarial, empresas, usuários e perfis.

Módulos antigos podem continuar fisicamente no repositório por histórico ou compatibilidade, mas **não são considerados ativos sem rota/import explícito**.

---

# Dashboard Gerencial v2

Implementação ativa:

- `js/dashboard-v2.js` — entrada/compatibilidade;
- `js/dashboard-cockpit-v2.js` — cockpit gerencial;
- `dashboard-v2.css` — apresentação.

O Dashboard deixou de ser um resumo fixo de DRE + Caixa e passou a ser um **cockpit configurável por usuário**.

## Princípios

- número relevante deve trazer **comparação, tendência, meta ou contexto** quando possível;
- resumo deve permitir aprofundamento no módulo de origem;
- widgets só aparecem quando o perfil possui acesso à fonte;
- usuário pode exibir/ocultar widgets e alterar sua ordem;
- preferência é persistida em `dashboardPreferencias/{uid}`;
- não existem “Atalhos de Gestão”: o menu principal já cumpre essa função;
- o Dashboard **não grava lançamentos** nem substitui os módulos de origem.

## Visões gerenciais

A baseline contempla ou prevê no cockpit:

- Receita, OPEX, Resultado e Margem;
- evolução mensal dos principais indicadores;
- análise patrimonial e equação do Balanço;
- comparação com Last Year;
- posição de Caixa e projeções D+30 / D+60 / D+90;
- Inadimplência & Aging;
- posição de Consórcios;
- posição de Permutas;
- Vendas, Faturamento, Meta e Comissões;
- maiores desvios Realizado x Budget.

---

# Contratos

Módulo operacional de gestão contratual com segregação por grupo/empresa e permissões de consulta, cadastro, edição, anexos e exclusão conforme perfil.

Coleção principal:

- `contratos`.

Contratos não devem gerar efeitos contábeis ou financeiros automáticos sem decisão arquitetural explícita.

---

# Consórcios

Módulo operacional/financeiro de primeiro nível, independente da Controladoria.

Arquivos principais:

- `js/ctrl-consorcios-v1.js`;
- `js/consortium-calculations.js`.

Coleção:

- `consorcios`.

Principais capacidades:

- gestão de ativos, contemplados, encerrados e cancelados;
- carta contratada e carta atual;
- parcelas, taxas, encargos e contemplação;
- saldo teórico;
- ficha individual;
- cronograma projetado;
- relatórios PDF/Excel.

O cronograma é **projeção**, não histórico de pagamentos realizados.

**Consórcios não alimenta automaticamente DRE, Balanço, Caixa, Budget, Forecast ou Imobilizado.**

---

# Permutas v2

Módulo operacional de primeiro nível.

Coleções:

- `permutas`;
- `permutaMovimentos`;
- `permutaFechamentos`.

Principais contratos:

- CPF/CNPJ com máscara e validação padronizadas no SIG;
- ficha individual;
- relatórios por intervalo exato de datas;
- movimentos de entrada/saída;
- estorno auditável com motivo, usuário e data/hora;
- movimento estornado permanece visível e não compõe saldo;
- inativação/reativação;
- fechamento por ciclo;
- opção de zeramento ou carregamento de saldo;
- finalização formal;
- exclusão física somente por Administrador, com reautenticação por senha;
- exclusão deve refletir imediatamente na interface, sem depender de reload completo.

A correção operacional padrão é **estorno/inativação**, não exclusão física.

---

# Vendas & Comissões

Módulo comercial de primeiro nível, fora da Controladoria.

Arquivos principais:

- `js/sales.js`;
- `js/sales-guard.js`;
- `js/sales-performance.js`;
- `js/sales-pangeia-import.js`;
- `sales.css`;
- `sales-performance.css`;
- `sales-import.css`.

Coleções:

- `vendedores`;
- `vendas`.

## Vendedores

O cadastro centraliza:

- nome/e-mail;
- empresa;
- meta mensal;
- comissão padrão (%);
- base da comissão;
- status ativo/inativo.

### Base da comissão

O vendedor pode ser configurado como:

- **Venda** — comissão gerada sobre a venda confirmada;
- **Faturamento** — comissão gerada sobre o valor efetivamente faturado.

Faturamento parcial é permitido.

Cada venda grava um **snapshot da regra aplicada** (`baseComissao`, `comissaoPct`, `comissaoBaseValor`, `comissaoValor`, `comissaoStatus`) para impedir recálculo retroativo caso a regra do vendedor seja alterada no futuro.

Fluxo da comissão:

`Aguardando faturamento → Provisionada → Aprovada → Paga`

Venda cancelada permanece no histórico e sai dos totais. Delete físico de venda/vendedor é bloqueado; vendedor deve ser inativado.

## Performance comercial

O cockpit por vendedor trabalha com:

- Venda x Faturamento x Meta;
- atingimento da meta;
- relação Faturado/Vendido;
- ticket médio;
- comissão;
- liderança e participação no total;
- maior atingimento;
- maior gap Venda x Faturamento;
- maior comissão;
- leituras gerenciais de exceção.

Clicar no vendedor permite aprofundar a carteira correspondente.

**Vendas não alimenta automaticamente DRE, Balanço, Caixa, Budget ou Forecast.**

---

# Importações

O SIG possui um núcleo reutilizável para importações:

- `js/import-center.js`.

Padrão obrigatório:

`arquivo → leitura local → parser do módulo → prévia → validações → duplicidades → conferência → gravação → rastreabilidade`

O arquivo bruto não deve ser enviado ao Firebase quando não houver necessidade funcional.

## Pangéia → Vendas

Primeiro adaptador ativo:

- `js/sales-pangeia-import.js`.

Fonte suportada:

- relatório TXT **Comissão por Vendedor** do Pangéia/Pangéia Lite;
- conteúdo textual colado manualmente.

A importação reconhece e preserva, entre outros:

- vendedor;
- percentual de comissão;
- número da venda;
- cliente;
- data;
- C.I.;
- valor líquido;
- comissão informada na origem;
- totais por vendedor;
- identificação do arquivo/fonte;
- chave de duplicidade.

Antes da gravação existe prévia, vinculação/cadastro de vendedor, validação de duplicidades e conferência de totais.

A importação é reiniciável: registros já gravados devem ser reconhecidos como duplicados na tentativa seguinte.

Documentação detalhada: [`docs/SIG-IMPORTACOES.md`](docs/SIG-IMPORTACOES.md).

---

# Controladoria & FP&A

A fonte de verdade das rotas é:

- `js/controllership-router.js`.

Módulos ativos da baseline:

- **DRE Gerencial v6** — `js/ctrl-dre-v6.js`;
- **Balanço Patrimonial v1** — `js/ctrl-balance-sheet-v1.js`;
- **Inadimplência & Aging** — `js/ctrl-delinquency-v1.js`;
- **Input Mensal v6** — `js/ctrl-input-v6.js`;
- **Budget v7** — `js/ctrl-budget-v7.js`;
- **Forecast v5** — `js/ctrl-forecast-v5.js`;
- **Fluxo de Caixa** — `js/cashflow.js`;
- **Prestação de Contas** — `js/accountability.js`;
- **Cockpit de Fechamento v3** — `js/closing-v3.js`;
- **Premissas v4** — `js/ctrl-premises-v4.js`;
- **Imobilizado & CAPEX v1** — `js/ctrl-assets-v1.js`;
- **Plano de Contas v6** — `js/ctrl-chart-accounts-v6.js`;
- **Centros de Custo v2** — `js/ctrl-cost-centers-v2.js`;
- **Configurações** — `js/ctrl-settings.js`.

Arquivos legados (`fpa.js` e versões antigas) não são fonte de verdade da Controladoria vigente.

---

## Plano de Contas v6

Máscara canônica:

`#.##.##.####`

Hierarquia:

`Raiz → Sintética N1 (#.##) → Sintética N2 (#.##.##) → Analítica (#.##.##.####)`

Exemplo:

`1 → 1.01 Ativo Circulante → 1.01.01 Disponibilidades → 1.01.01.0001 Caixa`

Regras fundamentais:

- Sintética nunca recebe lançamento;
- Analítica é folha lançável;
- `contaPaiId` preserva a hierarquia;
- natureza, raízes, redutoras e multiplicadores são centralizados em `js/account-mask.js`;
- saldo bruto persistido nunca é regravado apenas para ajustar apresentação;
- conta com histórico deve ser inativada, não apagada;
- exclusão física é restrita a cadastro de erro/teste sem referências.

Centros técnicos:

- Estatísticas: `__cc_estatistico__`;
- Balanço: `__cc_balanco__`.

---

## DRE, Balanço, Budget e Forecast

### Balanço

Balanço representa **posição de fechamento**, não fluxo.

- meses não são somados entre si;
- trimestre mostra meses + posição final do trimestre;
- ano mostra Jan–Dez + posição de dezembro;
- comparativo anual usa posição de fechamento correspondente.

### DRE

Utiliza raízes e multiplicadores gerenciais definidos centralmente. A base compartilhada de reporting é mantida em `js/financial-reporting.js`.

### Budget

Planejamento anual/versionado.

### Forecast

Combina realizado fechado e projeção futura conforme o contrato vigente.

### Premissas

Devem respeitar vigência e competência.

---

## Imobilizado & CAPEX

Coleção:

- `imobilizados`.

Integrações atuais:

- Balanço — custo e depreciação acumulada;
- Budget/Forecast — despesa de depreciação automática por Conta x Centro de Custo.

Fim da vida útil não baixa automaticamente o bem. CAPEX ainda não gera desembolso automático no Fluxo de Caixa.

Falha de leitura de base crítica deve operar em **fail-closed** nos cálculos dependentes.

---

## Inadimplência & Aging

Coleção:

- `inadimplenciaTitulos`.

Principais indicadores:

- carteira em aberto;
- valor vencido;
- índice de inadimplência (`vencido ÷ carteira em aberto`);
- exposição acima de 90 dias;
- aging:
  - a vencer;
  - 1–30 dias;
  - 31–60 dias;
  - 61–90 dias;
  - acima de 90 dias.

Permissões segregam **visualização** e **gestão da carteira**. Delete físico é bloqueado para preservar histórico.

---

# Governança & Compliance

Arquivos principais:

- `js/governance.js`;
- `js/governance-security.js`.

A estrutura consolida:

- riscos;
- obrigações;
- programas e ciclos de auditoria;
- achados;
- planos de ação;
- cockpit Antifraude & Segurança de TI.

## Antifraude & TI

O cockpit trabalha com controles simples e executáveis, sem tentar transformar o SIG em SIEM, antivírus ou plataforma GRC complexa.

Baseline de controles:

- validação independente de alteração bancária de fornecedor;
- conferência de beneficiário/CNPJ/CPF/banco em boleto ou Pix;
- MFA em acessos críticos;
- antivírus/EDR ativo e atualizado;
- patches de sistema operacional, navegadores e softwares críticos;
- bloqueio automático de tela;
- backup e teste de restauração;
- revisão de administradores e ex-colaboradores;
- treinamento contra phishing e fraude financeira;
- revisão de credenciais e sinais de comprometimento.

Achados da auditoria podem gerar **Planos de Ação** e acompanhamento mensal.

Documentação detalhada: [`docs/governanca-antifraude-inadimplencia.md`](docs/governanca-antifraude-inadimplencia.md).

---

# Minha Mesa e Planos de Ação

Minha Mesa concentra pendências e responsabilidades do usuário.

Planos de Ação preservam:

- responsável;
- criador;
- empresa/grupo;
- status;
- conclusão;
- trilha de atualização.

Reatribuição, edição e conclusão respeitam permissões próprias.

---

# Permissões e segurança

A autenticação é feita pelo Firebase Authentication, mas **autenticação não é autorização**.

A autorização é aplicada em camadas:

1. menu/visibilidade;
2. roteador/abertura do módulo;
3. guardas de ação na interface;
4. Firestore/Storage Rules como barreira de dados.

Perfis são definidos em:

- `js/profiles.js`.

Princípios:

- ocultar botão/menu não substitui Rule;
- toda leitura/gravação empresarial deve respeitar `grupoId` e `empresaId` quando aplicável;
- administrador possui acesso total, mas ações destrutivas críticas podem exigir confirmação adicional;
- módulo novo ou reposicionado deve atualizar o grid de Perfis e o Permissions Contract;
- nenhuma permissão deve ser concedida apenas por conveniência de frontend.

---

# Firebase

Arquivos versionados:

- `.firebaserc`;
- `firebase.json`;
- `firestore.rules`;
- `storage.rules`.

Coleções críticas da baseline incluem, entre outras:

- `imobilizados`;
- `planoContasGerencial`;
- `consorcios`;
- `permutas`;
- `permutaMovimentos`;
- `permutaFechamentos`;
- `inadimplenciaTitulos`;
- `dashboardPreferencias`;
- `vendedores`;
- `vendas`.

## Deploy: atenção

**GitHub Pages publica somente o frontend.**

Alterar `firestore.rules` ou `storage.rules` no GitHub **não publica essas Rules no Firebase**.

Quando uma release alterar Rules, o release só deve ser considerado completo após:

1. QA verde no commit final;
2. promoção do frontend para `main`;
3. GitHub Pages concluído;
4. publicação manual/automatizada da Rule correspondente ao mesmo SHA no Firebase;
5. teste funcional pós-publicação.

Nunca misturar Rule de um SHA com frontend de outro SHA.

Guia detalhado: [`docs/SIG-FIREBASE-DEPLOY-E-RULES.md`](docs/SIG-FIREBASE-DEPLOY-E-RULES.md).

---

# QA automatizado

Workflows principais da baseline:

- **SIG Quality Check**;
- **SIG Firebase Contract Check**;
- **SIG Permissions Contract Check**;
- **SIG Consorcios Contract Check**;
- **SIG Permutas Contract Check**;
- **SIG Dashboard Sales Contract Check**;
- **SIG Sales Import Contract Check**;
- **GitHub Pages build/deployment**.

Os contratos cobrem, conforme o módulo:

- sintaxe JavaScript;
- presença de arquivos críticos;
- rotas ativas;
- permissões;
- Rules;
- invariantes de cálculo;
- browser smoke em Chrome headless;
- contratos de importação e rastreabilidade.

Mudança estrutural não deve chegar à `main` com HEAD vermelho ou com apenas parte do pacote validada.

---

# Disciplina de release

Fluxo preferencial:

`branch → implementação → QA → comparação com main → PR → merge/promoção → QA em main → Pages → Rules (quando houver) → teste funcional`

Regras:

- buscar SHA/conteúdo atual antes de editar;
- não aplicar patch cego em arquivo que possa ter avançado;
- evitar force em produção;
- não usar Contents API para simular movimentação de branch;
- mudanças que alterem dados/autorização devem revisar Rules;
- frontend publicado não significa backend atualizado;
- rollback deve considerar frontend e Rules separadamente.

---

# Estrutura do repositório

```text
/
├── app.js
├── index.html
├── firestore.rules
├── storage.rules
├── firebase.json
├── AGENTS.md
├── SECURITY.md
├── README.md
├── js/
│   ├── core.js
│   ├── shared.js
│   ├── profiles.js
│   ├── controllership-router.js
│   ├── dashboard-v2.js
│   ├── dashboard-cockpit-v2.js
│   ├── sales.js
│   ├── sales-performance.js
│   ├── sales-pangeia-import.js
│   ├── import-center.js
│   ├── governance.js
│   ├── governance-security.js
│   ├── permutas.js
│   └── ...
├── docs/
│   ├── SIG-DOSSIE-DE-CONTINUIDADE.md
│   ├── SIG-MANUAL-MESTRE.md
│   ├── SIG-GUIA-DE-CONTINUIDADE.md
│   ├── SIG-FIREBASE-DEPLOY-E-RULES.md
│   ├── SIG-IMPORTACOES.md
│   ├── dashboard-v2-vendas.md
│   ├── governanca-antifraude-inadimplencia.md
│   ├── controladoria-arquitetura.md
│   ├── qa-controladoria-modular.md
│   └── release-controladoria-modular.md
└── .github/workflows/
```

---

# Documentação oficial

Para entender ou retomar o projeto, leia nesta ordem:

1. [`AGENTS.md`](AGENTS.md) — contrato para agentes/desenvolvedores;
2. [`docs/SIG-DOSSIE-DE-CONTINUIDADE.md`](docs/SIG-DOSSIE-DE-CONTINUIDADE.md) — estado funcional e arquitetural consolidado;
3. [`docs/SIG-MANUAL-MESTRE.md`](docs/SIG-MANUAL-MESTRE.md) — invariantes e regras permanentes;
4. [`docs/SIG-GUIA-DE-CONTINUIDADE.md`](docs/SIG-GUIA-DE-CONTINUIDADE.md) — retomada, release e rollback;
5. [`docs/SIG-FIREBASE-DEPLOY-E-RULES.md`](docs/SIG-FIREBASE-DEPLOY-E-RULES.md) — backend, Rules e publicação;
6. [`SECURITY.md`](SECURITY.md) — segurança;
7. [`docs/dashboard-v2-vendas.md`](docs/dashboard-v2-vendas.md) — Dashboard e Vendas;
8. [`docs/governanca-antifraude-inadimplencia.md`](docs/governanca-antifraude-inadimplencia.md) — Governança, Antifraude e Inadimplência;
9. [`docs/SIG-IMPORTACOES.md`](docs/SIG-IMPORTACOES.md) — arquitetura de importações;
10. [`docs/controladoria-arquitetura.md`](docs/controladoria-arquitetura.md) — mapa modular da Controladoria;
11. [`docs/qa-controladoria-modular.md`](docs/qa-controladoria-modular.md) — QA;
12. [`docs/release-controladoria-modular.md`](docs/release-controladoria-modular.md) — promoção/release.

## Fontes técnicas de verdade

Além da documentação:

- `app.js` — imports globais;
- `js/controllership-router.js` — módulos ativos da Controladoria;
- `js/profiles.js` — grid de permissões;
- `firestore.rules` / `storage.rules` — barreira de dados;
- `.github/workflows/` — contratos automatizados.

Conversa, memória de IA ou documento antigo **nunca devem ser a única fonte de verdade**.

---

# Regras de evolução do SIG

Toda nova tela, módulo ou mudança estrutural deve revisar, quando aplicável:

- menu e rota;
- grid de Perfis;
- guardas reais de abertura/ação;
- Firestore/Storage Rules;
- escopo `grupoId` / `empresaId`;
- coleções e modelo de auditoria;
- QA automatizado;
- documentação de continuidade;
- README.

**Regra documental:** qualquer release que crie, remova ou reposicione módulo, altere fluxo crítico, introduza nova coleção, mude permissões ou modifique Rules deve atualizar o `README.md` e os documentos específicos da arquitetura no mesmo PR.

---

# Limitações e decisões abertas

Na baseline atual:

- contas antigas não são migradas automaticamente para Plano v6;
- baixa/venda de ativo ainda não fecha automaticamente ganho/perda na DRE;
- CAPEX não gera desembolso automático no Caixa;
- Consórcios não integra automaticamente demonstrativos/caixa/planejamento;
- Permutas permanece independente da contabilidade automática;
- Vendas não gera automaticamente Receita, Contas a Receber ou lançamentos de DRE;
- faturamento comercial não substitui integração fiscal/ERP;
- Dashboard cruza fontes, mas não cria nova fonte de verdade;
- módulos legados não devem ser reativados sem decisão explícita.

---

## Estado da baseline

O SIG já combina **Controladoria modular, gestão operacional, Governança/Antifraude, Inadimplência, Dashboard Gerencial configurável, Vendas & Comissões, Consórcios, Permutas e arquitetura reutilizável de importações**.

A prioridade arquitetural continua sendo crescer com **módulos independentes, permissões explícitas, trilha auditável e integração intencional**, evitando acoplamento automático que transforme o sistema em um ERP monolítico difícil de manter.
