# SIG — Sistema Integrado de Gestão

WebApp/PWA empresarial voltado a **operação, controladoria, governança, segurança e decisão gerencial**, com frontend modular em JavaScript e backend gerenciado por Firebase Authentication + Cloud Firestore.

> **Documentação revisada em:** 08/09/2026  
> **Produção:** branch `main` — consulte o SHA atual no GitHub; o README não fixa SHA para não ficar obsoleto a cada merge documental  
> **Projeto Firebase:** `gestao-de-contratos-b266b`

O SIG não deve evoluir como uma coleção de telas isoladas. Cada módulo novo precisa nascer integrado à navegação, permissões, Rules, QA e documentação, preservando a separação entre **fonte operacional**, **fonte contábil/gerencial** e **visões executivas**.

---

## Visão do produto

O SIG combina quatro camadas:

1. **Operação** — Contratos, Consórcios, Permutas, Vendas & Comissões, Gestão de Frota e fluxos operacionais;
2. **Controladoria & FP&A** — DRE, Balanço, Budget, Forecast, Caixa, Fechamento, Inadimplência, Imobilizado e estruturas gerenciais;
3. **Governança & Compliance** — riscos, obrigações, auditorias, Antifraude & TI e Planos de Ação;
4. **Gestão executiva** — Dashboard Gerencial configurável e Minha Mesa.

O Dashboard cruza informações de várias fontes, mas **não se torna uma nova fonte contábil ou operacional**.

---

## Escopo ativo

### Navegação principal

- **Dashboard Gerencial v2**;
- **Minha Mesa**;
- **Contratos**;
- **Consórcios**;
- **Permutas**;
- **Vendas & Comissões**;
- **Gestão de Frota**;
- **Controladoria & FP&A**;
- **Governança & Compliance**;
- **Planos de Ação**;
- **Administração** de grupo empresarial, empresas, usuários e perfis.

Consórcios, Permutas, Vendas e Frota são módulos de primeiro nível e **não pertencem ao submenu da Controladoria**.

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

A baseline contempla:

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

A Gestão de Frota possui cockpit próprio; sua inclusão no Dashboard executivo deve acontecer somente quando os indicadores forem incorporados explicitamente à configuração de widgets.

---

# Contratos

Módulo operacional de gestão contratual com segregação por grupo/empresa e permissões de consulta, cadastro, edição e anexos.

Coleção principal:

- `contratos`.

A exclusão física é uma correção administrativa excepcional: somente Administrador, com reautenticação, justificativa e `auditoriaAdministrativa`. A Firestore Rule também exige `administrador()`.

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

Correção de cadastro indevido utiliza estorno administrativo para `cancelado`, preservando histórico. Delete físico permanece bloqueado.

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

## Vendedores e comissão

O cadastro centraliza nome/e-mail, empresa, meta mensal, comissão padrão, base de comissão e status.

A comissão pode ser gerada por:

- **Venda** — base na venda confirmada;
- **Faturamento** — base no valor efetivamente faturado, inclusive parcial.

Cada venda grava snapshot da regra aplicada (`baseComissao`, `comissaoPct`, `comissaoBaseValor`, `comissaoValor`, `comissaoStatus`) para impedir recálculo retroativo.

Fluxo:

`Aguardando faturamento → Provisionada → Aprovada → Paga`

Venda cancelada permanece no histórico e sai dos totais. Delete físico de venda/vendedor é bloqueado. A correção administrativa de venda grava `estornado: true` e `status: cancelada`; vendedor incorreto pode ser inativado por estorno administrativo sem alterar snapshots históricos.

## Performance comercial

O cockpit por vendedor trabalha com:

- Venda x Faturamento x Meta;
- atingimento;
- Faturado/Vendido;
- ticket médio;
- comissão;
- liderança e participação;
- maior gap Venda x Faturamento;
- leituras gerenciais de exceção.

**Vendas não alimenta automaticamente DRE, Balanço, Caixa, Budget ou Forecast.**

---

# Gestão de Frota v1

Módulo operacional de primeiro nível, fora da Controladoria.

Arquivos principais:

- `js/fleet.js`;
- `js/fleet-admin-actions.js`;
- `fleet.css`;
- `sidebar-layout.css` — correção estrutural de rolagem da sidebar;
- `docs/frota-v1.md` — contrato funcional e técnico.

Bases utilizadas:

- `veiculos`;
- `manutencoesFrota`;
- `imobilizados` somente quando houver sincronização patrimonial autorizada.

## Cockpit

Indicadores centrais:

- frota ativa;
- obrigações vencidas;
- vencimentos/revisões nos próximos 30 dias;
- manutenções abertas;
- custo operacional dos últimos 12 meses;
- score de saúde da frota.

A posição por veículo mostra placa, status, KM, próximo vencimento, situação de manutenção, custo 12 meses e situação do vínculo patrimonial.

## Veículos

Cadastro inclui:

- empresa;
- placa;
- RENAVAM;
- marca/modelo e ano;
- status;
- quilometragem;
- aquisição e valor;
- responsável/condutor principal;
- observações;
- mapeamento contábil quando autorizado.

Status previstos: ativo, em manutenção, inativo e baixado/vendido. Baixa/inativação é o ciclo normal. Exclusão física existe apenas como ação administrativa excepcional e é bloqueada quando houver Imobilizado, manutenção ou obrigação vinculada.

## IPVA, licenciamento, multas e infrações

A ficha do veículo mantém obrigações auditáveis de:

- IPVA;
- licenciamento;
- multa/infração;
- seguro;
- recall;
- outros vencimentos.

Campos incluem vencimento, exercício/parcela, valor, status, pagamento, auto/referência, órgão autuador, pontos, condutor e observação.

A interface identifica automaticamente situação vencida pela data e destaca os próximos 30 dias.

## Consulta oficial e automação

A v1 possui **consulta assistida**: o usuário abre o Portal de Serviços SENATRAN pelo SIG e a ficha registra a data da última conferência e a próxima revisão.

Existe possibilidade de integração oficial para pessoa jurídica por serviços Senatran/Serpro. Qualquer automação real deve seguir:

`SIG → backend seguro/Cloud Function → serviço oficial → validação/diferenças → atualização`

Nunca devem existir certificado, senha, token ou segredo de integração dentro do JavaScript público do PWA.

## Manutenções

Controle preventivo/corretivo por:

- data;
- quilometragem;
- serviço e oficina;
- custo previsto/realizado;
- data/KM realizados;
- próxima revisão por data/KM.

Manutenção é considerada vencida se a data passou **ou** o KM limite foi alcançado. Fica em alerta preventivo quando faltam até 30 dias ou até 1.000 km.

Manutenções e obrigações históricas possuem estorno e exclusão administrativa protegidos por reautenticação.

## Plano de Contas e Imobilizado

Cada veículo pode receber manualmente contas já cadastradas:

- conta patrimonial do Ativo;
- depreciação acumulada;
- despesa de depreciação;
- vida útil e data disponível para uso.

A conta patrimonial só pode ser escolhida entre contas analíticas válidas do Plano de Contas.

**Segregação obrigatória:** permissão de Frota não concede poder contábil. Somente usuário que também possua autorização de Imobilizado/Administração FP&A pode sincronizar a ficha com `imobilizados`.

Quando sincronizado, o registro patrimonial recebe `origem: "frota"` e `veiculoId`, evitando duplicidade conceitual entre ficha operacional e ficha contábil.

Documentação detalhada: [`docs/frota-v1.md`](docs/frota-v1.md).

---

# Importações

Núcleo reutilizável:

- `js/import-center.js`.

Padrão obrigatório:

`arquivo → leitura local → parser do módulo → prévia → validações → duplicidades → conferência → gravação → rastreabilidade`

O arquivo bruto não deve ser enviado ao Firebase quando não houver necessidade funcional.

## Pangéia → Vendas

Adaptador ativo:

- `js/sales-pangeia-import.js`.

Fonte suportada:

- relatório TXT **Comissão por Vendedor** do Pangéia/Pangéia Lite;
- conteúdo textual colado manualmente.

A importação reconhece vendedor, percentual, número da venda, cliente, data, C.I., valor líquido, comissão da origem, totais e chave de duplicidade. Antes da gravação existe prévia, vinculação/cadastro de vendedor, validação de duplicidades e conferência de totais.

A importação é reiniciável: registros já gravados devem ser reconhecidos como duplicados.

Documentação: [`docs/SIG-IMPORTACOES.md`](docs/SIG-IMPORTACOES.md).

---

# Controladoria & FP&A

Fonte de verdade das rotas:

- `js/controllership-router.js`.

Módulos ativos:

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

## Plano de Contas v6

Máscara canônica:

`#.##.##.####`

Hierarquia:

`Raiz → Sintética N1 → Sintética N2 → Analítica`

Regras fundamentais:

- Sintética nunca recebe lançamento;
- Analítica é folha lançável;
- `contaPaiId` preserva a hierarquia;
- natureza, raízes, redutoras e multiplicadores são centralizados em `js/account-mask.js`;
- saldo bruto persistido nunca é regravado apenas para ajustar apresentação;
- conta com histórico deve ser inativada;
- exclusão física é restrita a cadastro de erro/teste sem referências, somente por Administrador, com reautenticação e auditoria.

Centros técnicos:

- Estatísticas: `__cc_estatistico__`;
- Balanço: `__cc_balanco__`.

## DRE, Balanço, Budget e Forecast

Balanço representa **posição de fechamento**, não fluxo. Meses não são somados entre si.

DRE usa os multiplicadores gerenciais centralizados. Budget é anual/versionado. Forecast combina realizado fechado e projeção futura. Premissas respeitam vigência/competência.

Sublinhas persistidas de Budget/Forecast possuem estorno administrativo: o detalhe é inativado e a linha agregada é recalculada no mesmo batch com auditoria.

`js/financial-reporting.js` concentra base compartilhada para evitar fórmulas paralelas.

## Input Mensal

A correção administrativa de Realizado é feita por Empresa × competência × Centro/bloco. O estorno zera somente o mês selecionado nos documentos afetados, preserva os demais meses e grava snapshot dos valores anteriores em `auditoriaAdministrativa`.

## Fluxo de Caixa

Lançamentos possuem estorno e exclusão física administrativa. Contas bancárias e compromissos fixos usam inativação auditada para preservar vínculos históricos.

## Imobilizado & CAPEX

Coleção:

- `imobilizados`.

Integrações atuais:

- Balanço — custo e depreciação acumulada;
- Budget/Forecast — despesa de depreciação automática por Conta x Centro de Custo;
- Frota — veículos mapeados podem gerar/atualizar ficha patrimonial, respeitando permissão de Imobilizado.

Fim da vida útil não baixa automaticamente o bem. CAPEX ainda não gera desembolso automático no Caixa. Estorno administrativo de ficha indevida cancela o cadastro e desliga as integrações; baixa real continua sendo tratada pelo status `baixado`.

## Inadimplência & Aging

Coleção:

- `inadimplenciaTitulos`.

Indicadores:

- carteira em aberto;
- valor vencido;
- índice de inadimplência (`vencido ÷ carteira em aberto`);
- exposição acima de 90 dias;
- aging a vencer / 1–30 / 31–60 / 61–90 / >90 dias.

Visualização e gestão são permissões separadas. Delete físico é bloqueado. Correção administrativa usa estorno para `cancelado`, mantendo o título no histórico.

---

# Governança & Compliance

Arquivos principais:

- `js/governance.js`;
- `js/governance-security.js`.

Estrutura:

- riscos;
- obrigações;
- programas/ciclos de auditoria;
- achados;
- Planos de Ação;
- Cockpit Antifraude & Segurança de TI.

Baseline Antifraude & TI:

- validação independente de alteração bancária;
- conferência de beneficiário/CNPJ/CPF/banco em boleto/Pix;
- MFA;
- antivírus/EDR;
- patches;
- bloqueio automático de tela;
- backup/teste de restauração;
- revisão de acessos privilegiados;
- treinamento contra phishing;
- revisão de credenciais/sinais de comprometimento.

Documentação: [`docs/governanca-antifraude-inadimplencia.md`](docs/governanca-antifraude-inadimplencia.md).

---

# Minha Mesa e Planos de Ação

Minha Mesa concentra pendências e responsabilidades do usuário. Planos de Ação preservam responsável, criador, empresa/grupo, status, conclusão e trilha de atualização.

Reatribuição, edição e conclusão respeitam permissões próprias.

---

# Permissões e segurança

Autenticação não é autorização. A autorização é aplicada em camadas:

1. menu/visibilidade;
2. rota/abertura do módulo;
3. guardas de ação na interface;
4. Firestore/Storage Rules como barreira de dados.

Perfis:

- `js/profiles.js`.

Princípios:

- ocultar botão/menu não substitui Rule;
- toda leitura/gravação empresarial respeita `grupoId` e `empresaId` quando aplicável;
- administrador possui acesso total, mas ações críticas podem exigir confirmação adicional;
- módulo novo/reposicionado atualiza grid de Perfis e Permissions Contract;
- módulo operacional não herda automaticamente poderes contábeis.

## Correções administrativas

**Todo módulo que cria input persistente deve possuir um caminho explícito e auditável de correção.**

Contrato vigente:

- estorno é preferido quando há histórico, saldo, cálculo ou efeito operacional;
- delete físico é excepcional;
- ação administrativa exige perfil Administrador, senha atual e justificativa;
- reautenticação usa Firebase Authentication no frontend;
- `auditoriaAdministrativa` preserva a trilha e é append-only;
- correções multi-registro usam batch atômico;
- Firestore Rules exigem `administrador()` para deletes físicos permitidos;
- falha na validação de dependências bloqueia exclusão (**fail-closed**).

Adaptadores:

- `js/admin-actions.js` — helper central;
- `js/cashflow-admin-actions.js` — lançamentos de Caixa;
- `js/fleet-admin-actions.js` — Frota;
- `js/input-admin-actions.js` — inputs operacionais/FP&A;
- `js/master-admin-actions.js` — cadastros mestres e deletes físicos protegidos.

Política completa: [`docs/SIG-CORRECOES-ADMINISTRATIVAS.md`](docs/SIG-CORRECOES-ADMINISTRATIVAS.md).

## Frota

Permissões existentes:

- `frota.visualizar`;
- `frota.cadastrar`;
- `frota.editar`;
- `frota.manutencao`;
- `frota.obrigacoes`;
- `frota.excluir` permanece como chave legada; exclusão física efetiva é governada pelo contrato administrativo e pela Rule de Administrador.

A integração patrimonial exige, adicionalmente, autorização de Imobilizado/Controladoria.

---

# Firebase

Arquivos versionados:

- `.firebaserc`;
- `firebase.json`;
- `firestore.rules`;
- `storage.rules`.

Coleções críticas incluem:

- `imobilizados`;
- `planoContasGerencial`;
- `consorcios`;
- `permutas`, `permutaMovimentos`, `permutaFechamentos`;
- `inadimplenciaTitulos`;
- `dashboardPreferencias`;
- `vendedores`;
- `vendas`;
- `veiculos`;
- `manutencoesFrota`;
- `auditoriaAdministrativa`.

## Deploy: atenção

**GitHub Pages publica somente o frontend.** Alterar `firestore.rules` ou `storage.rules` no GitHub **não publica essas Rules no Firebase**.

Quando uma release alterar Rules, o release só está completo após:

1. QA verde no commit final;
2. promoção do frontend para `main`;
3. GitHub Pages concluído;
4. publicação da Rule correspondente ao mesmo SHA no Firebase;
5. teste funcional pós-publicação.

Nunca misturar Rule de um SHA com frontend de outro SHA.

Guia: [`docs/SIG-FIREBASE-DEPLOY-E-RULES.md`](docs/SIG-FIREBASE-DEPLOY-E-RULES.md).

---

# CSS e navegação lateral

A sidebar possui altura fixa à viewport para permanecer disponível durante a navegação. Como o submenu da Controladoria cresceu, uma sidebar sem `overflow-y` fazia itens ultrapassarem o fundo azul e aparecerem sobre a área clara.

Correção vigente:

- `sidebar-layout.css`;
- `100dvh` em navegadores compatíveis;
- rolagem vertical própria;
- overflow horizontal bloqueado;
- scrollbar discreta;
- comportamento mobile preservado.

A solução **não reduz fonte nem esconde opções para fazê-las caber**.

---

# QA automatizado

Workflows principais:

- **SIG Quality Check**;
- **SIG Firebase Contract Check**;
- **SIG Permissions Contract Check**;
- **SIG Consorcios Contract Check**;
- **SIG Permutas Contract Check**;
- **SIG Dashboard Sales Contract Check**;
- **SIG Sales Import Contract Check**;
- **SIG Fleet Contract Check**;
- **SIG Admin Correction Contract Check**;
- **GitHub Pages build/deployment**.

Os contratos cobrem sintaxe, arquivos críticos, rotas, permissões, Rules, invariantes, browser smoke e rastreabilidade.

Mudança estrutural não deve chegar à `main` com HEAD vermelho ou pacote incompleto.

---

# Disciplina de release

Fluxo preferencial:

`branch → implementação → QA → comparação com main → PR → merge → QA em main → Pages → Rules (quando houver) → teste funcional`

Regras:

- buscar SHA/conteúdo atual antes de editar;
- não aplicar patch cego em arquivo que possa ter avançado;
- evitar force em produção;
- não usar Contents API para simular movimentação de branch;
- mudanças de dados/autorização revisam Rules;
- frontend publicado não significa backend atualizado;
- rollback considera frontend e Rules separadamente.

---

# Estrutura do repositório

```text
/
├── app.js
├── index.html
├── firestore.rules
├── storage.rules
├── firebase.json
├── README.md
├── SECURITY.md
├── sidebar-layout.css
├── fleet.css
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
│   ├── fleet.js
│   ├── admin-actions.js
│   ├── cashflow-admin-actions.js
│   ├── fleet-admin-actions.js
│   ├── input-admin-actions.js
│   ├── master-admin-actions.js
│   ├── governance.js
│   ├── governance-security.js
│   ├── permutas.js
│   └── ...
├── docs/
│   ├── SIG-DOSSIE-DE-CONTINUIDADE.md
│   ├── SIG-MANUAL-MESTRE.md
│   ├── SIG-GUIA-DE-CONTINUIDADE.md
│   ├── SIG-FIREBASE-DEPLOY-E-RULES.md
│   ├── SIG-CORRECOES-ADMINISTRATIVAS.md
│   ├── SIG-IMPORTACOES.md
│   ├── dashboard-v2-vendas.md
│   ├── governanca-antifraude-inadimplencia.md
│   ├── frota-v1.md
│   ├── controladoria-arquitetura.md
│   └── ...
└── .github/workflows/
```

---

# Documentação oficial

Ordem recomendada:

1. [`AGENTS.md`](AGENTS.md) — contrato para agentes/desenvolvedores;
2. [`docs/SIG-DOSSIE-DE-CONTINUIDADE.md`](docs/SIG-DOSSIE-DE-CONTINUIDADE.md) — estado funcional/arquitetural;
3. [`docs/SIG-MANUAL-MESTRE.md`](docs/SIG-MANUAL-MESTRE.md) — invariantes;
4. [`docs/SIG-GUIA-DE-CONTINUIDADE.md`](docs/SIG-GUIA-DE-CONTINUIDADE.md) — retomada/release/rollback;
5. [`docs/SIG-FIREBASE-DEPLOY-E-RULES.md`](docs/SIG-FIREBASE-DEPLOY-E-RULES.md) — backend/Rules;
6. [`docs/SIG-CORRECOES-ADMINISTRATIVAS.md`](docs/SIG-CORRECOES-ADMINISTRATIVAS.md) — estorno, reautenticação, auditoria e delete físico;
7. [`SECURITY.md`](SECURITY.md) — segurança;
8. [`docs/dashboard-v2-vendas.md`](docs/dashboard-v2-vendas.md) — Dashboard/Vendas;
9. [`docs/frota-v1.md`](docs/frota-v1.md) — Gestão de Frota;
10. [`docs/governanca-antifraude-inadimplencia.md`](docs/governanca-antifraude-inadimplencia.md) — Governança/Antifraude/Inadimplência;
11. [`docs/SIG-IMPORTACOES.md`](docs/SIG-IMPORTACOES.md) — importações;
12. [`docs/controladoria-arquitetura.md`](docs/controladoria-arquitetura.md) — Controladoria;
13. [`docs/qa-controladoria-modular.md`](docs/qa-controladoria-modular.md) — QA;
14. [`docs/release-controladoria-modular.md`](docs/release-controladoria-modular.md) — promoção.

Fontes técnicas de verdade:

- `app.js` — imports globais;
- `js/controllership-router.js` — Controladoria;
- `js/profiles.js` — permissões;
- `js/admin-actions.js` e adaptadores administrativos — correções protegidas;
- `firestore.rules` / `storage.rules` — barreira de dados;
- `.github/workflows/` — contratos automatizados.

Conversa, memória de IA ou documento antigo **nunca devem ser a única fonte de verdade**.

---

# Regras de evolução do SIG

Toda nova tela, módulo ou mudança estrutural revisa, quando aplicável:

- menu e rota;
- grid de Perfis;
- guardas reais de abertura/ação;
- Firestore/Storage Rules;
- escopo `grupoId` / `empresaId`;
- política de correção administrativa;
- coleções/modelo de auditoria;
- QA automatizado;
- documentação de continuidade;
- README.

**Regra documental:** qualquer release que crie, remova ou reposicione módulo, altere fluxo crítico, introduza coleção, mude permissões ou modifique Rules atualiza `README.md` e os documentos específicos no mesmo PR.

---

# Limitações e decisões abertas

- contas antigas não são migradas automaticamente para Plano v6;
- baixa/venda de ativo ainda não fecha automaticamente ganho/perda na DRE;
- CAPEX não gera desembolso automático no Caixa;
- Consórcios não integra automaticamente demonstrativos/caixa/planejamento;
- Permutas permanece independente da contabilidade automática;
- Vendas não gera automaticamente Receita/Contas a Receber/DRE;
- faturamento comercial não substitui integração fiscal/ERP;
- Frota ainda não consome API oficial automaticamente; a v1 usa consulta assistida e deixa integração server-side como evolução;
- custo de Frota v1 é TCO operacional simplificado, não custo contábil completo;
- Dashboard cruza fontes, mas não cria nova fonte de verdade;
- módulos legados não devem ser reativados sem decisão explícita.

---

## Estado da baseline

O SIG combina **Controladoria modular, gestão operacional, Gestão de Frota, Governança/Antifraude, Inadimplência, Dashboard configurável, Vendas & Comissões, Consórcios, Permutas, arquitetura reutilizável de importações e correções administrativas auditáveis**.

A prioridade arquitetural continua sendo crescer com **módulos independentes, permissões explícitas, trilha auditável e integração intencional**, evitando acoplamento automático que transforme o sistema em um ERP monolítico difícil de manter.
