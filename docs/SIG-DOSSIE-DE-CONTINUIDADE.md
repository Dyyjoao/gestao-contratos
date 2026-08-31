# SIG — Dossiê de Continuidade do Projeto

**Sistema Integrado de Gestão (SIG)**  
**Documento portátil de handoff técnico, funcional e arquitetural**  
**Baseline funcional:** 31/08/2026  
**Repositório de referência:** `Dyyjoao/gestao-contratos`  
**Produção:** `main`

---

## 0. Fonte de verdade e ordem de leitura

Este documento descreve o estado funcional consolidado do SIG. Ele não substitui o código: a execução vigente deve sempre ser confirmada no repositório antes de uma alteração.

Ordem recomendada:

1. `AGENTS.md`;
2. este Dossiê;
3. `docs/SIG-MANUAL-MESTRE.md`;
4. `docs/SIG-GUIA-DE-CONTINUIDADE.md`;
5. `SECURITY.md`;
6. `app.js`;
7. `js/controllership-router.js` para Controladoria & FP&A;
8. `firestore.rules` e `storage.rules` quando houver dados, permissões ou anexos;
9. `.github/workflows/js-check.yml` antes de mudar arquitetura/testes.

**Regra de ouro:** conversa, memória de IA ou conhecimento informal nunca são a única fonte de verdade do SIG.

Arquivos antigos podem continuar no repositório por compatibilidade ou histórico. O nome `vN` sozinho não define qual módulo está ativo. Para Controladoria, a rota em `js/controllership-router.js` é a referência operacional.

---

# 1. Visão do produto

O SIG é um sistema empresarial de gestão, controle e decisão. Ele não deve evoluir como uma coleção de telas isoladas.

Camadas conceituais:

- **Operação:** fontes de eventos e compromissos empresariais;
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

Módulos operacionais antigos podem permanecer no código para reaproveitamento futuro, mas não devem ser reativados no SIG sem decisão arquitetural explícita.

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
- segurança efetiva em `firestore.rules`;
- `storage.rules` preparado para evolução de anexos;
- Google Drive ainda pode ser usado como referência temporária de anexos.

## 2.3 Hospedagem e banco são independentes

GitHub Pages hospeda o frontend; os dados ficam no Firebase/Firestore.

Mudar o frontend para Firebase Hosting, Vercel, Netlify, Cloudflare Pages ou outro host **não apaga nem migra automaticamente o banco**. Mantendo o mesmo projeto Firebase, a base continua a mesma.

Migração de dados só é necessária quando o modelo de dados mudar ou quando houver decisão explícita de trocar o projeto Firebase.

---

# 3. Contexto global e multiempresa

O cabeçalho global controla:

1. Grupo empresarial;
2. Empresa(s);
3. Exercício;
4. Período — mês, trimestre ou total, conforme módulo.

Regras:

- relatórios gerenciais podem consolidar várias empresas;
- telas de lançamento normalmente exigem uma única empresa;
- Input Mensal exige competência mensal;
- Fluxo de Caixa é monoempresa;
- Prestação de Contas é monoempresa;
- Budget é anual: o exercício global define o orçamento; a competência mensal do cabeçalho não corta a matriz anual;
- DRE e Dashboard usam o período global para apresentação;
- telas pesadas podem marcar contexto como alterado e exigir `Atualizar`, evitando consultas desnecessárias.

Nenhuma tela de lançamento deve usar silenciosamente “a primeira empresa selecionada” quando o contexto tiver várias empresas.

---

# 4. Controladoria & FP&A — rotas vigentes

O submenu atual é definido em `js/controllership-router.js`.

Rotas principais consolidadas:

- DRE Gerencial — `ctrl-dre-v6.js`;
- Balanço Patrimonial — `ctrl-balance-sheet-v1.js`;
- Input Mensal — `ctrl-input-v6.js`;
- Budget — `ctrl-budget-v7.js`;
- Forecast — `ctrl-forecast-v5.js`;
- Fluxo de Caixa — `cashflow.js`, carregado sob demanda dentro do shell FP&A;
- Prestação de Contas — `accountability.js`, carregada sob demanda dentro do shell FP&A;
- Cockpit de Fechamento — `closing-v3.js`;
- Permutas — `permutas.js`;
- Premissas — `ctrl-premises-v4.js`;
- Imobilizado & CAPEX — `ctrl-assets-v1.js`;
- Plano de Contas — `ctrl-chart-accounts-v5.js`;
- Centros de Custo — `ctrl-cost-centers-v2.js`;
- Configurações — `ctrl-settings.js`.

Atalhos de Configurações devem abrir essas rotas atuais, nunca telas antigas por caminhos paralelos.

---

# 5. Plano de Contas Gerencial

## 5.1 Máscara vigente

A estrutura aprovada é fixa:

```text
1 Ativo
2 Passivo
3 Receita
4 Despesa
9 Estatística

#          = raiz do sistema
#.##       = Sintética
#.##.####  = Analítica
```

Não existe, na arquitetura vigente, uma árvore financeira com níveis Sintéticos arbitrários além dessa máscara.

Regras:

- raiz é estrutural do sistema;
- `#.##` é Sintética;
- `#.##.####` é Analítica;
- Sintética nunca recebe lançamento manual;
- Analítica é a folha lançável;
- `contaPaiId` liga a Analítica à Sintética;
- códigos não devem ser reutilizados automaticamente;
- contas legadas fora da máscara podem ser preservadas até migração controlada.

## 5.2 Vigência

Contas possuem vigência histórica por exercício.

A inativação:

- não apaga histórico;
- deve bloquear se houver uso incompatível no exercício de início da inativação ou em exercícios posteriores;
- deve considerar Realizado, Budget, Forecast, detalhamentos, premissas e vínculos relevantes como Imobilizado;
- pode ser aplicada a um ramo quando a Sintética é inativada.

## 5.3 Cópia entre empresas

A cópia do Plano transfere estrutura e parâmetros, nunca:

- saldos;
- Realizado;
- Budget;
- Forecast;
- premissas;
- Centros de Custo;
- histórico.

Códigos existentes no destino são preservados e não sobrescritos silenciosamente.

Operações de grande volume devem ser divididas em lotes compatíveis com os limites do Firestore.

---

# 6. Natureza contábil e multiplicadores

O núcleo de regra está em `js/account-mask.js`.

| Raiz | Natureza padrão | Apresentação normal | Resultado |
|---|---|---:|---:|
| 1 Ativo | Devedora | +1 | 0 |
| 2 Passivo | Credora | +1 | 0 |
| 3 Receita | Credora | +1 | +1 |
| 4 Despesa | Devedora | +1 | -1 |
| 9 Estatística | Neutra | informativa | 0 |

Campos estruturados relevantes:

- `naturezaContabil`;
- `multiplicadorApresentacao`;
- `multiplicadorResultado`;
- `contaRedutora`.

## 6.1 Regra de conta redutora

Conta redutora é definida pela natureza oposta à natureza padrão da raiz.

Exemplo:

```text
1.01.0001 Máquinas e Equipamentos   Devedora  apresentação +1
1.01.0002 Depreciação Acumulada     Credora   apresentação -1
```

Com saldos brutos 1.000.000 e 300.000:

```text
Imobilizado líquido = 1.000.000 + (300.000 × -1) = 700.000
```

O texto `(-)` no nome não é fonte de verdade.

## 6.2 Invariante crítica

**Multiplicador é de apresentação/cálculo gerencial. Ele nunca regrava ou corrige o saldo bruto persistido.**

Override explícito de natureza em conta Analítica deve prevalecer sobre inferência automática.

---

# 7. Centros técnicos

Dois Centros técnicos internos são reservados:

```text
__cc_estatistico__
__cc_balanco__
```

Eles existem para manter identidade consistente de documentos e não devem aparecer como Centros de Custo operacionais normais.

- Estatísticas usam `__cc_estatistico__`;
- Balanço usa `__cc_balanco__`.

---

# 8. Input Mensal

Regras:

- uma empresa por lançamento;
- uma competência mensal;
- Sintética nunca editável;
- Analítica financeira depende da matriz Centro × Conta;
- Estatística Manual pode ser digitada;
- Estatística Automática/Calculada fica bloqueada;
- Balanço recebe saldo bruto de fechamento;
- competência fechada/bloqueada impede alteração;
- documento canônico prevalece sobre duplicidade;
- duplicidades nunca são somadas silenciosamente;
- legado financeiro sem CC pode ser arquivado de forma controlada;
- CCs técnicos de Estatística/Balanço nunca são tratados como “legado sem CC”.

## 8.1 Conta patrimonial automática

Quando uma conta de Balanço é controlada automaticamente pelo Imobilizado:

- o Input mostra o valor automático;
- a digitação manual é bloqueada;
- saldo manual antigo, se existir, deve ser sinalizado para reconciliação e ignorado na apresentação automática, não apagado silenciosamente.

---

# 9. Balanço Patrimonial

O Balanço é uma **posição de fechamento**, não uma DRE e não uma soma de meses.

Regras:

- raízes 1 e 2;
- somente contas patrimoniais ativas do exercício;
- valores armazenados permanecem brutos;
- `multiplicadorApresentacao` define a apresentação;
- conta redutora reduz o subtotal sem exigir saldo negativo no banco;
- Sintéticas somam as Analíticas correspondentes;
- multiempresa consolida por **código contábil**, não por ID interno de conta;
- divergência de natureza para o mesmo código entre empresas deve ser sinalizada;
- diferença final `Ativo − Passivo/PL` deve ficar visível;
- Imobilizado integrado pode substituir a origem manual das contas mapeadas;
- legado deve ser evidenciado/reconciliado, não descartado silenciosamente.

Mês e trimestre mostram posições. Um trimestre não é a soma dos três Balanços mensais.

---

# 10. Estatísticas e Indicadores

Contas Estatísticas usam a mesma máscara, com raiz 9 e natureza neutra.

Tipos conceituais:

- Driver operacional;
- Indicador calculado.

Modo de preenchimento:

- `manual`;
- `automatico`.

Conta antiga sem flag deve ser tratada como Manual por compatibilidade até configuração explícita.

Consolidação estatística deve declarar:

- Soma;
- Média;
- Último valor;
- Recalcular fórmula.

Percentuais/índices não podem ser somados indiscriminadamente ao consolidar períodos.

---

# 11. Budget e Forecast

## 11.1 Budget

Budget é anual e possui ciclo formal por Empresa + Exercício + Versão:

```text
NÃO ABERTO → EM ELABORAÇÃO → FINALIZADO
```

Pode ser reaberto por perfil autorizado.

Regras:

- Realizado A-1 usa o exercício imediatamente anterior ao exercício selecionado;
- linha Analítica principal é calculada pelas sublinhas/memórias;
- Sintéticas somam descendentes;
- conta pode ser fechada individualmente;
- versão nova não apaga versão anterior.

## 11.2 Forecast

```text
FY Forecast = Realizado fechado + projeção futura
```

Meses fechados pertencem ao Realizado e não podem ser sobrescritos pelo Forecast.

## 11.3 Premissas e vigência

Premissas podem valer para Budget, Forecast ou ambos.

Regras:

- premissa específica do CC vence premissa corporativa;
- a vigência é aplicada **mês a mês**;
- uma premissa Jan–Jun não pode controlar Jul–Dez;
- uma premissa Jul–Dez não pode retroagir para Jan–Jun;
- override mensal pode substituir parâmetro-base;
- conta × CC com premissa vigente bloqueia lançamento manual no período controlado;
- sublinha criada por premissa deve manter origem identificável.

Drivers já suportados conceitualmente:

- A-1 + percentual;
- valor fixo;
- repetir A-1;
- quantidade × preço unitário.

---

# 12. Imobilizado & CAPEX

CAPEX é investimento e não deve ser classificado como despesa operacional apenas para caber na DRE.

O motor de depreciação usa `js/asset-depreciation.js` e integra planejamento por `js/asset-planning.js`.

Dados principais:

- valor de aquisição;
- valor residual;
- vida útil;
- data de aquisição/desembolso;
- data disponível para uso;
- data de baixa;
- conta do Ativo;
- conta de Depreciação Acumulada;
- conta de Despesa de Depreciação;
- Centro de Custo da despesa;
- integração com Balanço;
- integração com Budget/Forecast.

Regras:

- bem não deprecia antes de estar disponível para uso;
- conta de Ativo deve ser patrimonial compatível;
- Depreciação Acumulada deve ser conta redutora do Ativo;
- conta de despesa deve ser compatível com resultado;
- integração automática substitui projeção manual da mesma Conta × CC para evitar duplicidade;
- Budget/Forecast e DRE devem reconhecer a depreciação automática.

---

# 13. DRE Gerencial

DRE é relatório, não tela de lançamento.

Modos:

- Por Centro de Custo;
- Consolidada por conta.

Cenários:

- Realizado;
- Budget;
- Forecast.

Regras consolidadas:

- apenas contas financeiras de resultado entram na DRE;
- Ativo, Passivo e Estatística não entram no resultado;
- natureza/multiplicador de resultado vem do núcleo comum;
- consolidação multiempresa é por **código**, não por ID da conta;
- cada empresa pode usar sua própria versão mais recente de Budget/Forecast na consolidação;
- depreciação automática do Imobilizado entra sem duplicar linha manual;
- Estatísticas aparecem em bloco separado quando solicitado;
- Sintéticas podem expandir/recolher;
- linha final apresenta `RESULTADO / SALDO DO PERÍODO`.

---

# 14. Núcleo comum de relatórios financeiros

`js/financial-reporting.js` centraliza a interpretação financeira usada por Dashboard e Prestação de Contas e deve ser preferido a regras locais paralelas.

Objetivo:

- excluir Balanço/Estatística do resultado;
- respeitar natureza/multiplicador;
- canonicalizar documentos;
- resolver versões de planejamento por empresa;
- integrar depreciação automática;
- manter Dashboard, DRE e Prestação semanticamente coerentes.

Não recriar em cada relatório regras próprias do tipo “Receita = X; todo o resto = OPEX”.

---

# 15. Dashboard

Dashboard financeiro/executivo deve derivar Receita, OPEX e Resultado de contas financeiras de DRE.

Regras:

- Ativo e Passivo nunca viram OPEX;
- Estatística não entra no resultado;
- custos/despesas reduzem resultado conforme núcleo contábil;
- CAPEX é apresentado separadamente;
- Budget/Forecast respeitam versões e base financeira canônica;
- posição de caixa é tratada como posição financeira, não resultado contábil.

---

# 16. Fluxo de Caixa

Fluxo de Caixa é monoempresa.

Se o usuário mudar o cabeçalho para múltiplas empresas enquanto a tela estiver aberta:

- dados atuais da tela são limpos;
- ações de criar/editar/exportar ficam bloqueadas;
- formulários abertos são fechados;
- a tela informa que exige uma única empresa;
- nenhuma gravação ocorre usando “a primeira empresa”.

A tela mantém:

- contas bancárias;
- saldo liquidado hoje;
- D+30/D+60/D+90;
- lançamentos;
- provisões;
- compromissos fixos;
- geração idempotente de provisões quando aplicável.

Competência contábil e data de caixa são conceitos distintos.

---

# 17. Prestação de Contas

Prestação de Contas é monoempresa porque comentários, cabeçalho e PDF pertencem a uma empresa específica.

Regras:

- usa a mesma base financeira canônica dos demais relatórios;
- Balanço/Estatística não entram como OPEX;
- mostra Receita, OPEX, Resultado e CAPEX;
- desvios são calculados contra Budget;
- comentários são salvos por competência/CC/conta;
- PDF executivo inclui DRE gerencial, desvios, CAPEX, caixa e ações;
- contexto multiempresa bloqueia análise/salvamento/PDF.

A evolução futura deve aprofundar narrativa gerencial e indicadores industriais, sem duplicar motores de cálculo.

---

# 18. Fechamento

Existe fechamento mensal e anual.

Regras:

- checklist deve ser idempotente;
- identidade deve ser determinística por Empresa × Competência × tarefa;
- duplicidades legadas podem ser arquivadas sem destruir histórico;
- fechamento/bloqueio impede alterações em telas de lançamento;
- configuração temporal deve preservar competências anteriores.

---

# 19. Centros de Custo

Centro de Custo responde **onde**; Conta responde **o que**.

A matriz Centro × Conta deve listar apenas contas:

- financeiras de resultado;
- Analíticas;
- ativas no exercício.

Ativo/Passivo usam CC técnico do Balanço. Estatísticas usam CC técnico estatístico. Eles não pertencem à matriz operacional comum.

---

# 20. Segurança

A política oficial está em `SECURITY.md`.

Princípios resumidos:

- autenticação não é autorização;
- ocultar botão não é segurança;
- `firestore.rules` é a barreira real de dados;
- Grupo/Empresa devem ser preservados;
- menor privilégio;
- sem segredos no frontend/repositório;
- nova coleção/padrão de escrita exige revisão de Rules;
- mudanças de domínio/hospedagem exigem revisão dos domínios autorizados do Firebase Authentication.

---

# 21. Modelo de dados relevante

Coleções do núcleo atual incluem:

| Coleção | Finalidade |
|---|---|
| `usuarios` | usuários/escopo |
| `perfisAcesso` | permissões |
| `gruposEmpresariais` | grupos |
| `empresas` | empresas |
| `contratos` | contratos |
| `planoContasGerencial` | Plano de Contas |
| `centrosCusto` | Centros de Custo/matriz |
| `premissasPlanejamento` | premissas |
| `realizadoMensal` | Realizado |
| `budgetLinhas` | Budget e ciclo |
| `forecastLinhas` | Forecast |
| `planejamentoDetalhes` | sublinhas/memórias |
| `imobilizados` | Imobilizado/CAPEX |
| `contasBancarias` | contas bancárias |
| `fluxoCaixaLancamentos` | movimentos de caixa |
| `fluxoCaixaFixos` | compromissos recorrentes |
| `prestacaoContas` | cabeçalhos/comentários executivos |
| `prestacaoComentarios` | comentários por conta |
| `fechamentoTarefas` | checklist |
| `fechamentosMensais` | estado do fechamento |
| `planosAcao` | ações |
| `permutas` | acordos |
| `permutaMovimentos` | razão da permuta |

Antes de usar coleção nova, confirmar `firestore.rules`.

---

# 22. Compatibilidade e migrações

Novas versões devem assumir que dados antigos já existem.

Padrões aprovados:

- default compatível na leitura;
- adicionar campo novo sem destruir o antigo;
- documento canônico;
- `legadoArquivado` / `duplicadoArquivado` quando apropriado;
- migração idempotente;
- rollback possível;
- nunca corrigir dado persistido apenas para compensar erro de apresentação.

Exemplo: conta estatística antiga sem modo explícito continua Manual até configuração consciente.

---

# 23. Política de código legado

O repositório ainda pode conter gerações anteriores de módulos, como versões antigas de DRE, Input, Budget, Plano, Premissas, Closing e matrizes.

Esses arquivos:

- não são automaticamente parte do produto ativo;
- não devem ser importados por nova funcionalidade só porque existem;
- só podem ser excluídos após prova de que nenhuma rota, import dinâmico, migração ou compatibilidade depende deles;
- devem ser tratados como dívida técnica/histórico até remoção segura.

A prioridade é eliminar **rotas antigas e duas verdades**, não apagar histórico às cegas.

---

# 24. QA e release

Antes de promover uma mudança estrutural:

1. conferir diff contra `main`;
2. rodar `node --check`;
3. validar contratos arquiteturais do workflow;
4. importar módulos dinâmicos;
5. executar smoke test em navegador headless;
6. validar Rules quando persistência mudar;
7. atualizar documentação;
8. conferir que não há referências de rota a versões antigas;
9. testar contexto monoempresa/multiempresa conforme módulo;
10. testar dados antigos/duplicados;
11. testar fechamento;
12. testar rollback do frontend sem apagar dados.

Quality Check verde é condição necessária, não prova isolada de correção funcional.

---

# 25. Casos mínimos de QA contábil

Antes de release de Controladoria:

1. Ativo normal;
2. contra-Ativo;
3. Passivo normal;
4. contra-Passivo;
5. Receita;
6. Despesa;
7. Estatística neutra;
8. override manual de natureza;
9. saldo bruto preservado;
10. Balanço fecha Ativo = Passivo/PL;
11. Balanço mensal não soma posições;
12. consolidação multiempresa por código;
13. divergência de natureza entre empresas;
14. premissa Jan–Jun + Jul–Dez;
15. conta fora da vigência;
16. Budget A-1 correto;
17. Forecast Realizado fechado + futuro;
18. depreciação automática sem duplicidade;
19. Input automático do Imobilizado bloqueado;
20. Dashboard/Prestação ignorando Balanço e Estatística;
21. Fluxo de Caixa bloqueado em multiempresa;
22. Prestação bloqueada em multiempresa.

---

# 26. Continuidade, backup e hospedagem futura

Antes de tornar o SIG crítico para operação real, instituir política de backup de dados e teste de restauração.

Código e dados são ativos diferentes.

Para mudança de host/domínio:

1. preservar commit/tag estável;
2. manter o mesmo Firebase inicialmente;
3. configurar novo host;
4. atualizar domínios autorizados do Firebase Auth;
5. testar HTTPS/login/perfis/Rules;
6. testar uma empresa e consolidação;
7. alterar DNS somente após aceite;
8. manter rollback do frontend disponível.

Funcionalidades com segredos, IA, integrações server-to-server ou migrações administrativas devem migrar para backend confiável (Cloud Functions/Cloud Run ou equivalente), nunca para JavaScript cliente.

---

# 27. Roadmap sem alterar as invariantes atuais

Possíveis evoluções:

- motor seguro de fórmulas de indicadores;
- Prestação/Board Pack mais executivos;
- motor tributário versionado por vigência;
- aprovação genérica;
- agenda/SLA/notificações;
- diário de decisões;
- pesquisa global;
- timeline por entidade;
- Committed Budget / What-if;
- metas de KPI;
- IA de apoio a Budget/Forecast/Prestação com aceitar/editar/descartar e sem autosave crítico.

O workflow de solicitação/cotação/aprovação futuro deve ser simples e mobile; não deve duplicar um sistema completo de Compras.

---

# 28. Checklist obrigatório para atualização estrutural

Responder SIM antes de considerar a entrega pronta:

- [ ] código preserva dados existentes;
- [ ] Grupo/Empresa/permissões estão corretos;
- [ ] telas monoempresa bloqueiam contexto múltiplo;
- [ ] Sintéticas seguem não lançáveis;
- [ ] Estatísticas continuam fora do resultado;
- [ ] Balanço continua posição, não soma;
- [ ] natureza/multiplicadores vêm do núcleo comum;
- [ ] saldo bruto não foi regravado para ajustar sinal;
- [ ] duplicidades não são somadas silenciosamente;
- [ ] Budget/Forecast/DRE/Dashboard/Prestação estão semanticamente coerentes;
- [ ] vigências são respeitadas;
- [ ] Imobilizado não duplica projeção/manual;
- [ ] fechamentos protegem lançamentos;
- [ ] Firestore Rules cobrem mudanças de persistência;
- [ ] QA automático passou;
- [ ] QA funcional relevante foi executado;
- [ ] documentação foi atualizada;
- [ ] existe rollback do frontend sem apagar a base.

---

# 29. Regra de manutenção deste dossiê

Atualize este documento quando houver:

- novo módulo ou remoção de módulo;
- mudança de rota ativa;
- alteração da máscara/hierarquia do Plano;
- mudança de natureza/multiplicador;
- mudança de contexto global;
- nova regra de canonicalização;
- nova coleção relevante;
- nova regra de fechamento;
- mudança em Budget/Forecast/Premissas;
- mudança no Balanço/Imobilizado;
- mudança de segurança/permissões;
- mudança de hospedagem/dados/anexos;
- novo motor automático relevante.

**Se o código muda estruturalmente e este documento permanece antigo, a entrega está incompleta.**