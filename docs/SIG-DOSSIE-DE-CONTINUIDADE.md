# SIG — Dossiê de Continuidade do Projeto

**Sistema Integrado de Gestão (SIG)**  
**Documento portátil de handoff técnico, funcional e arquitetural**  
**Baseline funcional:** 01/09/2026  
**Repositório:** `Dyyjoao/gestao-contratos`  
**Produção:** `main`

---

## 0. Fonte de verdade e ordem de leitura

Este documento descreve o estado funcional consolidado do SIG. O código executável continua sendo a prova final do comportamento vigente.

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

**Regra de ouro:** conversa, memória de IA ou conhecimento informal nunca são a única fonte de verdade do SIG.

Arquivos antigos podem permanecer no repositório por compatibilidade ou histórico. O maior número `vN` não define sozinho qual módulo está ativo. Para Controladoria, a rota em `js/controllership-router.js` é a referência operacional.

---

# 1. Visão do produto

O SIG é um sistema empresarial de gestão, controle e decisão. Ele deve evoluir como uma arquitetura integrada, não como uma coleção de telas isoladas.

Camadas conceituais:

- **Operação:** fontes de eventos e compromissos;
- **Gestão:** Controladoria & FP&A;
- **Controle:** Governança & Compliance;
- **Execução:** Minha Mesa, exceções e planos de ação;
- **Direção:** Dashboard, Prestação de Contas e futuro Board Mode.

Escopo ativo priorizado:

- Dashboard;
- Minha Mesa;
- Contratos;
- Controladoria & FP&A;
- Governança & Compliance;
- Administração.

Módulos operacionais antigos podem permanecer fisicamente no repositório, mas não devem ser reativados sem decisão arquitetural explícita.

---

# 2. Arquitetura técnica

## 2.1 Frontend

- HTML/CSS/JavaScript ES Modules;
- entrada: `index.html` + `app.js`;
- módulos em `/js`;
- comportamento PWA;
- módulos pesados carregados sob demanda;
- hospedagem atual: GitHub Pages;
- sem servidor de aplicação próprio no desenho atual.

## 2.2 Backend gerenciado

- Firebase Authentication;
- Cloud Firestore;
- Firebase Storage para caminhos suportados;
- regras de autorização em `firestore.rules` e `storage.rules`.

## 2.3 Contrato Firebase do repositório

A partir da baseline de 01/09/2026, o repositório contém:

- `.firebaserc` → projeto `gestao-de-contratos-b266b`;
- `firebase.json` → referencia `firestore.rules` e `storage.rules`;
- `firestore.rules`;
- `storage.rules`.

Esses arquivos formam o contrato de deploy do backend gerenciado.

## 2.4 Frontend e Rules são deploys independentes

**GitHub Pages publica apenas o frontend.**

Promover `main` e concluir o Pages não publica automaticamente:

- Firestore Rules;
- Storage Rules;
- índices Firestore;
- configurações administrativas do Firebase.

Portanto, uma release que altera Rules só está concluída quando as Rules também forem publicadas no Firebase e testadas em produção.

Esse ponto passou a ser uma invariante formal após a consolidação de Imobilizado/CAPEX: o frontend novo foi capaz de chegar ao Pages antes de haver confirmação de que a nova Rule de `imobilizados` estava ativa no Firebase.

---

# 3. Recuperação e checkpoint histórico

Antes da consolidação estrutural de 31/08/2026, foi preservado o snapshot:

```text
archive/sig-pre-consolidacao-2026-08-31
```

Esse snapshot aponta para o estado cumulativo pré-consolidação e deve ser tratado como recuperação histórica, não como branch normal de desenvolvimento.

O desenvolvimento deve partir da `main` vigente ou de branch criada explicitamente a partir dela.

---

# 4. Contexto global e multiempresa

O cabeçalho global controla:

1. Grupo empresarial;
2. Empresa(s);
3. Exercício;
4. Período — mês, trimestre ou total, conforme módulo.

Regras:

- relatórios podem consolidar várias empresas quando o módulo declarar suporte;
- telas de lançamento normalmente exigem uma única empresa;
- Input Mensal exige uma empresa e competência mensal;
- Fluxo de Caixa é monoempresa;
- Prestação de Contas é monoempresa;
- Imobilizado & CAPEX é monoempresa;
- Budget/Forecast para edição são monoempresa;
- DRE e Balanço podem consolidar várias empresas;
- nenhuma gravação pode usar silenciosamente “a primeira empresa selecionada”.

---

# 5. Controladoria & FP&A — rotas vigentes

O submenu é definido em `js/controllership-router.js`.

Rotas consolidadas da baseline:

- DRE Gerencial — `ctrl-dre-v6.js`;
- Balanço Patrimonial — `ctrl-balance-sheet-v1.js`;
- Input Mensal — `ctrl-input-v6.js`;
- Budget — `ctrl-budget-v7.js`;
- Forecast — `ctrl-forecast-v5.js`;
- Fluxo de Caixa — módulo compartilhado atual;
- Prestação de Contas — módulo compartilhado atual;
- Fechamento — `closing-v3.js`;
- Premissas — `ctrl-premises-v4.js`;
- Imobilizado & CAPEX — `ctrl-assets-v1.js`;
- Plano de Contas — `ctrl-chart-accounts-v5.js`;
- Centros de Custo — `ctrl-cost-centers-v2.js`.

Budget e Forecast possuem wrappers próprios e usam o motor compartilhado `ctrl-planning-matrix-v2.js`.

A abertura real de Budget/Forecast passou a ser testada no navegador após correção de um bug em que o wrapper passava `pagina-ctrl-*` para `abrirPagina()`, fazendo o core procurar `pagina-pagina-ctrl-*`.

---

# 6. Plano de Contas — contrato canônico

## 6.1 Raízes

```text
1 Ativo
2 Passivo
3 Receita
4 Despesa
9 Estatística
```

## 6.2 Máscara

```text
#.##       Sintética
#.##.####  Analítica
```

A raiz também é sintética virtual do sistema.

Regras:

- Sintética agrupa e nunca recebe lançamento manual;
- Analítica é folha lançável quando permitida pelo contexto;
- `contaPaiId` define a relação hierárquica;
- ciclos são proibidos;
- códigos novos são gerados dentro da máscara;
- contas legadas fora da máscara podem permanecer visíveis até migração controlada.

## 6.3 Vigência

Contas podem possuir vigência por exercício.

Inativação não apaga histórico. Antes de programar inativação, o SIG verifica uso atual/futuro em:

- Realizado;
- Budget;
- Forecast;
- detalhamento de planejamento;
- premissas;
- Imobilizado/CAPEX.

Se a coleção `imobilizados` estiver indisponível, a inativação é bloqueada por segurança.

---

# 7. Natureza contábil e multiplicadores

A natureza estruturada é a fonte de verdade.

Padrões:

| Raiz | Natureza padrão | Resultado |
| --- | --- | --- |
| Ativo | Devedora | não compõe DRE |
| Passivo | Credora | não compõe DRE |
| Receita | Credora | +1 |
| Despesa | Devedora | -1 |
| Estatística | Neutra | 0 |

Conta redutora usa natureza oposta à raiz.

Exemplos:

- Ativo normal → apresentação +1;
- contra-Ativo / Depreciação Acumulada → apresentação -1;
- Passivo normal → apresentação +1;
- contra-Passivo → apresentação -1;
- Receita normal → resultado +1;
- contra-Receita → resultado -1;
- Despesa normal → resultado -1;
- contra-Despesa → resultado +1;
- Estatística → resultado 0.

**Saldo bruto armazenado nunca é regravado para aplicar sinal.** Multiplicadores são de apresentação e cálculo gerencial.

O helper central é `js/account-mask.js`.

---

# 8. Centros técnicos

O SIG usa centros técnicos que não representam Centros de Custo operacionais:

```text
__cc_estatistico__
__cc_balanco__
```

- `__cc_estatistico__` organiza drivers/indicadores estatísticos;
- `__cc_balanco__` organiza posições patrimoniais no `realizadoMensal`.

Esses centros não devem ser confundidos com centros cadastrados pelo usuário.

---

# 9. Input Mensal

O Input é a entrada canônica do Realizado.

Regras:

- uma empresa por vez;
- competência mensal para lançamento;
- Sintéticas nunca editáveis;
- contas estatísticas calculadas não são lançáveis;
- contas patrimoniais usam posição de fechamento, não movimento;
- saldo patrimonial bruto é armazenado sem inversão de sinal;
- contas patrimoniais controladas automaticamente pelo Imobilizado ficam bloqueadas para lançamento manual;
- documento canônico é preferido e duplicidades são reconciliadas/arquivadas conforme regras do módulo.

Se `imobilizados` falhar, o Input não pode assumir que as contas automáticas são manuais. O motor de integração bloqueia o cálculo automático.

---

# 10. Balanço Patrimonial

O Balanço é relatório de posição.

Regras:

- mês = posição daquele fechamento;
- trimestre = exibe posições dos três fechamentos, sem somá-las;
- total anual = exibe as doze posições, sem somá-las entre si;
- consolidação multiempresa por código contábil;
- natureza/multiplicador central aplicado apenas na apresentação;
- redutoras diminuem a posição do grupo;
- Ativo e Passivo/PL são reconciliados;
- diferença Ativo − Passivo/PL é exibida;
- contas Sintéticas ausentes podem ser reconstruídas para reconciliação e sinalizadas;
- divergência de natureza do mesmo código entre empresas é sinalizada;
- contas legadas permanecem na reconciliação.

## 10.1 Integração de Imobilizado

Para bens com `integrarBalanco === true`:

- conta do Ativo bruto é derivada do cadastro do bem;
- conta de Depreciação Acumulada recebe o acumulado calculado;
- valor automático substitui o saldo manual da mesma conta no relatório;
- baixa remove o bem das posições posteriores à data de baixa.

Se `imobilizados` estiver indisponível, o Balanço não deve calcular como se não houvesse bens.

---

# 11. Budget

Budget é anual, versionado e governado por ciclo.

Estados:

- NÃO ABERTO;
- EM ELABORAÇÃO;
- FINALIZADO.

Características:

- exercício vem do cabeçalho global;
- A-1 = realizado do exercício imediatamente anterior;
- linha Analítica principal é calculada por sublinhas, premissas ou automação;
- Sintéticas são subtotais;
- versões são preservadas;
- orçamento finalizado bloqueia edição até reabertura;
- conta fechada bloqueia edição manual.

A abertura efetiva da tela Budget é coberta pelo browser smoke test.

---

# 12. Forecast

Forecast combina:

```text
meses fechados = Realizado
meses futuros  = Forecast
```

Regras:

- meses fechados não são sobrescritos;
- projeção futura pode vir de sublinha, premissa ou automação;
- versão e exercício são explícitos;
- depreciação automática se aplica somente aos meses futuros; meses fechados permanecem Realizado.

A abertura efetiva da tela Forecast também é coberta pelo browser smoke test.

---

# 13. Premissas

Premissas são resolvidas por competência, não apenas por ano.

Exemplo válido:

- Premissa A: Jan–Jun;
- Premissa B: Jul–Dez.

O motor seleciona a premissa válida para cada mês.

Prioridade:

1. premissa específica do Centro de Custo;
2. premissa corporativa aplicável.

Uma premissa ativa controla o valor projetado e bloqueia edição manual equivalente até que o fluxo seja alterado conscientemente.

---

# 14. Imobilizado & CAPEX

Coleção persistente:

```text
imobilizados
```

Campos principais:

- descrição;
- categoria;
- status;
- data de aquisição/desembolso;
- data disponível para uso;
- data de baixa;
- valor de aquisição/CAPEX;
- valor residual;
- vida útil em meses;
- Centro de Custo da depreciação;
- conta do Ativo;
- conta de Depreciação Acumulada;
- conta de Despesa de Depreciação;
- integração com Balanço;
- integração com Budget/Forecast;
- observações.

Status cadastráveis:

- Planejado / CAPEX;
- Em implantação;
- Em operação;
- Baixado;
- Cancelado.

## 14.1 Depreciação

- base depreciável = valor de aquisição − valor residual;
- depreciação inicia na disponibilidade para uso;
- não ocorre antes da disponibilidade para uso em bem planejado/em implantação;
- termina ao completar a vida útil;
- acumulada nunca supera a base depreciável;
- VCL nunca fica abaixo do valor residual.

**Fim da depreciação não significa baixa.** Bem totalmente depreciado continua no patrimônio enquanto não houver baixa efetiva.

## 14.2 Planejamento

Quando `integrarPlanejamento === true`:

- Budget recebe a depreciação anual automática;
- Forecast usa Realizado nos meses fechados e depreciação automática nos meses futuros;
- a automação substitui, e não soma, a projeção manual da mesma Conta × CC;
- DRE Budget/Forecast recebe a mesma depreciação projetada.

CAPEX não vira despesa operacional. A DRE recebe depreciação/amortização; o desembolso do investimento deve ser tratado separadamente no fluxo financeiro quando esse motor for evoluído.

---

# 15. Dependência crítica de `imobilizados` e fail-closed

A auditoria de 01/09/2026 identificou cinco consumidores que antes toleravam falha de leitura de `imobilizados` como lista vazia:

1. Balanço;
2. Input;
3. Budget/Forecast;
4. DRE projetada;
5. validação de inativação do Plano de Contas.

Isso era perigoso porque um `permission-denied` poderia parecer “nenhum bem cadastrado” e produzir número incorreto sem alerta.

A regra da baseline passa a ser:

> **dependência contábil crítica deve falhar de forma fechada.**

O núcleo de dados registra falhas por coleção. Os motores de depreciação/Balanço verificam a disponibilidade de `imobilizados` antes de calcular. O Plano de Contas bloqueia a inativação se não conseguir confirmar vínculos patrimoniais.

Nunca reintroduzir `.catch(() => [])` como mecanismo de normalização de uma base crítica sem uma trava posterior que diferencie “coleção vazia” de “coleção indisponível”.

---

# 16. DRE Gerencial

A DRE usa natureza/multiplicador central.

Características:

- Realizado;
- Budget;
- Forecast;
- visão por Centro de Custo;
- visão consolidada multiempresa por código;
- estatísticas separadas do resultado financeiro;
- exportação Excel/PDF;
- estrutura Sintética/Analítica;
- cada empresa usa sua própria versão mais recente quando a visão projetada for consolidada;
- depreciação automática do Imobilizado entra nos cenários projetados sem duplicar linha manual.

Ativo, Passivo e Estatística não podem virar OPEX por regra genérica.

---

# 17. Dashboard e Prestação de Contas

O helper `js/financial-reporting.js` centraliza a classificação financeira usada pelas visões que precisam interpretar Receita, Custo/Despesa e Resultado.

Objetivo: evitar que cada relatório reinvente sinais e classificação.

Prestação de Contas é monoempresa porque comentários, cabeçalho e saída pertencem a uma empresa determinada.

Fluxo de Caixa também é monoempresa.

O shell desses módulos não carrega mais o antigo `fpa.js` apenas para construir abas.

---

# 18. Segurança e permissões

O frontend não é camada de segurança.

Princípios:

- Authentication identifica o usuário;
- Firestore Rules autorizam os dados;
- Storage Rules autorizam arquivos;
- toda leitura/gravação deve respeitar Grupo e Empresa;
- nenhuma nova coleção pode ser lançada sem Rule correspondente.

## 18.1 Regra do Imobilizado

A Rule de `imobilizados` exige:

- `controladoria.visualizar` para leitura;
- permissão `controladoria.imobilizado` ou capacidade FP&A de edição para criar/alterar;
- documento acessível ao Grupo/Empresa;
- preservação de `grupoId` e `empresaId` em update;
- delete desabilitado.

## 18.2 Storage

A release atual não inclui anexos próprios no Imobilizado. Se isso for implementado no futuro, revisar previamente a granularidade da permissão de Storage.

---

# 19. Modelo de deploy

## 19.1 Frontend

Fluxo atual:

```text
branch → QA → main → GitHub Pages
```

## 19.2 Backend Rules

Quando houver mudança de Rules:

```text
revisão → Firebase CLI autenticada → deploy das Rules → teste autenticado
```

Comando operacional documentado:

```bash
firebase deploy --only firestore:rules,storage
```

A execução depende de credencial autorizada e não deve armazenar segredos no Git.

Uma release com Rule alterada não deve ser marcada como concluída antes dessa segunda etapa.

---

# 20. Matriz de persistência da baseline

| Recurso | Coleção principal | Observação |
| --- | --- | --- |
| Plano de Contas | `planoContasGerencial` | natureza, máscara, vigência e estrutura |
| Centros de Custo | `centrosCusto` | contas permitidas por CC |
| Realizado / Input | `realizadoMensal` | inclui CCs técnicos |
| Budget | `budgetLinhas` | inclui metadados de ciclo/versão |
| Forecast | `forecastLinhas` | projeção futura |
| Memória de planejamento | `planejamentoDetalhes` | sublinhas e origem |
| Premissas | `premissasPlanejamento` | vigência por competência |
| Imobilizado/CAPEX | `imobilizados` | nova coleção da consolidação |
| Fechamento | `fechamentosMensais` | bloqueio/competência |

Nova coleção desta consolidação estrutural: **`imobilizados`**.

As demais evoluções principais desta versão usaram coleções já existentes e não exigiram novos blocos de Rules apenas por adicionarem campos.

---

# 21. QA e contratos de regressão

O QA deve verificar, no mínimo:

- sintaxe de todos os módulos ativos;
- imports dinâmicos;
- abertura real de Budget/Forecast;
- rotas vigentes;
- ausência de reativação do FP&A legado;
- natureza e multiplicadores;
- Balanço e CC técnico;
- Imobilizado e depreciação;
- vigência de premissas;
- monoempresa onde exigido;
- contrato Firebase (`firebase.json`, `.firebaserc`, Rules);
- fail-closed da coleção `imobilizados`.

Smoke de importação sozinho não é prova de abertura funcional de uma tela.

---

# 22. Política de release e rollback

Antes de merge:

1. branch comparada com `main`;
2. QA verde;
3. documentação atualizada;
4. novas coleções cobertas por Rules;
5. dependências críticas sem falha silenciosa;
6. rollback conhecido.

Depois do merge:

1. validar Pages;
2. validar Quality Check;
3. publicar Rules separadamente quando alteradas;
4. testar com usuário autenticado;
5. conferir console;
6. só então encerrar a release.

Rollback de frontend não deve apagar dados.

Rollback de Rules deve considerar compatibilidade com o frontend restaurado.

---

# 23. Hosting futuro e domínio

O frontend pode migrar para Firebase Hosting, Vercel, Netlify, Cloudflare Pages ou host pago com domínio próprio sem migrar automaticamente o Firestore.

Mantendo `gestao-de-contratos-b266b`, a base de dados permanece no mesmo projeto.

Ao trocar domínio:

- configurar HTTPS;
- revisar domínio autorizado no Firebase Authentication;
- testar login;
- testar Rules;
- preservar cache/versionamento;
- não colocar segredo no frontend.

---

# 24. Compras — limite de escopo futuro

O SIG não deve virar um sistema completo de Compras.

Objetivo futuro:

1. operação solicita cotação pelo celular;
2. comprador conduz/lança cotações;
3. gestor aprova;
4. processo é finalizado.

O Pangeia continua como sistema próprio de Compras. O SIG atua apenas como camada simples de workflow/aprovação, especialmente amigável para mobile.

---

# 25. Handoff para próxima IA/equipe

Ao retomar o projeto:

1. leia os documentos oficiais;
2. confirme a `main` atual;
3. confira `js/controllership-router.js`;
4. confira `firebase.json`, `.firebaserc` e Rules;
5. não assuma que Rule no Git está publicada;
6. preserve saldo bruto;
7. preserve Grupo/Empresa;
8. respeite máscara e natureza;
9. preserve CCs técnicos;
10. trate `imobilizados` como dependência crítica das integrações automáticas;
11. não converta erro de coleção crítica em zero silencioso;
12. atualize documentação e QA junto com mudanças estruturais.

Texto curto:

> O SIG está na baseline 01/09/2026 com Plano v5, natureza/multiplicadores centrais, Balanço, Input patrimonial, Budget/Forecast, vigências e Imobilizado/CAPEX integrado. GitHub Pages publica apenas o frontend; Rules Firebase têm deploy separado. A coleção `imobilizados` é crítica para Balanço, Input, planejamento, DRE projetada e inativação do Plano. Se ela falhar, o SIG deve bloquear cálculos/ações automáticos, nunca assumir lista vazia. Confira o roteador e as Rules antes de alterar a arquitetura.

---

# 26. Pendências funcionais conhecidas que NÃO devem ser confundidas com bug

Itens ainda não implementados como ciclo completo:

- integração de desembolso CAPEX ao Fluxo de Caixa;
- tratamento completo de alienação/baixa com ganho ou perda na DRE;
- status calculado visual “Totalmente depreciado · Em uso”;
- anexos patrimoniais específicos do Imobilizado;
- workflow simplificado futuro de solicitações/cotações/aprovação.

Esses pontos são roadmap, não funcionalidade já entregue.

---

# 27. Regra final de coerência

Toda mudança estrutural futura deve responder, antes do merge:

- qual módulo ativo muda?
- qual dado muda?
- existe coleção/campo novo?
- a Rule precisa mudar?
- a Rule foi apenas versionada ou também será publicada?
- qual relatório depende desse dado?
- o que acontece se a leitura falhar?
- o comportamento é fail-closed quando o número contábil depende da base?
- qual QA impede regressão?
- qual documentação precisa ser atualizada?

Se essas respostas não estiverem claras, a mudança ainda não está pronta para produção.
