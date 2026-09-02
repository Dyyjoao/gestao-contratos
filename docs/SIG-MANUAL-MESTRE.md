# SIG — Manual Mestre de Arquitetura e Regras

> Documento de invariantes do Sistema Integrado de Gestão (SIG).  
> Atualizado em: 02/09/2026 — Plano v6 + Balanço + Consórcios + Permutas v2 + Governança/Antifraude + Inadimplência + Dashboard v2 + Vendas.

O estado funcional completo está em `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`. Aqui ficam as regras que uma evolução não pode quebrar silenciosamente.

---

## 1. Fontes versionadas

A lógica do SIG deve existir em:

1. código-fonte;
2. `firestore.rules` / `storage.rules`;
3. `firebase.json` / `.firebaserc`;
4. `SECURITY.md`;
5. documentação em `/docs`;
6. QA automatizado.

Memória de conversa não substitui nenhuma dessas fontes.

---

## 2. Contexto e segurança

- autenticação não é autorização;
- Grupo e Empresa são fronteiras de segurança;
- updates não podem trocar `grupoId`/`empresaId` para escapar do escopo;
- tela monoempresa exige uma empresa explicitamente selecionada;
- consulta multiempresa só é aceita quando o módulo foi desenhado para isso;
- GitHub Pages não publica Firestore/Storage Rules;
- Rule alterada exige deploy Firebase separado;
- base crítica indisponível não pode ser convertida silenciosamente em `[]` ou zero.

**Regra de novos módulos:** toda nova aba/módulo navegável deve nascer, no mesmo pacote, com revisão da grade de Perfis de Acesso, bloqueio real da rota/ação, Rules quando aplicável e QA de permissões. Esconder menu não substitui autorização.

---

## 3. Plano de Contas v6

### 3.1 Máscara

Máscara canônica: `#.##.##.####`.

Hierarquia única:

- nível 0 — raiz `1/2/3/4/9`;
- nível 1 — Sintética N1 `#.##`;
- nível 2 — Sintética N2 `#.##.##`;
- nível 3 — Analítica `#.##.##.####`.

Somente Analíticas são lançáveis. Sintéticas apenas organizam e consolidam.

### 3.2 Raízes

- `1` Ativo — Devedora;
- `2` Passivo — Credora;
- `3` Receita — Credora;
- `4` Despesa — Devedora;
- `9` Estatística — Neutra.

Patrimônio Líquido é estruturado dentro da raiz 2.

### 3.3 Natureza e sinais

`js/account-mask.js` é a única fonte para:

- raiz;
- natureza contábil;
- conta redutora;
- multiplicador de apresentação;
- multiplicador de resultado;
- validação da máscara.

Saldos persistidos permanecem brutos. Nunca regravar saldo para corrigir apresentação.

Conta redutora = natureza oposta à raiz. Não inferir pelo texto do nome.

### 3.4 Vigência

Inativação histórica usa `inativaAPartirExercicio`.

Conta inativa deve oferecer ação **Reativar**. Reativação remove a inativação futura e restaura status ativo. Sintética pode reativar o ramo inteiro.

### 3.5 Exclusão

Exclusão física só é válida para erro/teste sem qualquer referência.

Antes de excluir, o aplicativo deve verificar Realizado, Budget, Forecast, detalhamento, Premissas, Imobilizado, Centros de Custo e bases legadas relacionadas.

Se houver histórico ou vínculo, a conta deve ser inativada, não excluída.

A Rule de `planoContasGerencial` permite delete apenas para `fpaPlano()` no documento acessível.

### 3.6 Legado

Contas anteriores à v6 não são migradas implicitamente. A limpeza de legado/testes deve ser explícita, confirmada e bloqueada se houver dependências.

---

## 4. Hierarquia e relatórios

`contaPaiId` é o vínculo estrutural persistido. Utilidades genéricas de árvore devem suportar profundidade sem codificar quantidade fixa de níveis.

Exceções que consolidam por código devem reconhecer N1 e N2:

- Balanço Patrimonial;
- DRE consolidada multiempresa.

Balanço deve reconciliar todas as Analíticas patrimoniais aplicáveis, inclusive legado ainda preservado.

Balanço é **posição**, nunca soma de saldos mensais:

- trimestre = meses visíveis + posição do último mês em `Total Tn`;
- ano = Jan–Dez + posição de dezembro em `Total Ano`;
- comparativo anual = dezembro do ano atual x dezembro do Last Year, com variação em valor e percentual.

---

## 5. Centros técnicos

- Balanço: `__cc_balanco__`;
- Estatísticas: `__cc_estatistico__`.

Ativo/Passivo não usam CC operacional. Estatísticas não entram no resultado financeiro.

Centro de Custo operacional pode vincular somente contas Analíticas financeiras compatíveis.

---

## 6. DRE e planejamento

- DRE financeira usa raízes 3 e 4;
- resultado usa `multiplicadorResultado`;
- Balanço e Estatísticas ficam fora de OPEX/Resultado;
- Budget é anual e versionado;
- Forecast = Realizado fechado + projeção futura;
- versão de Budget/Forecast é resolvida por empresa;
- Premissas são resolvidas por competência/vigência;
- Premissa específica de CC prevalece sobre corporativa quando aplicável;
- depreciação automática pode substituir projeção manual da mesma Conta × CC conforme regra atual.

---

## 7. Imobilizado

A coleção `imobilizados` é crítica.

- integração patrimonial alimenta custo e depreciação acumulada;
- integração de planejamento alimenta despesa de depreciação;
- fim da vida útil encerra depreciação, não baixa o bem;
- CAPEX cadastrado não é histórico imutável de Budget;
- CAPEX ainda não gera desembolso automático no Fluxo de Caixa.

Falha de leitura de `imobilizados` deve interromper cálculos dependentes de forma explícita.

---

## 8. Consórcios v1

A coleção `consorcios` é independente das bases contábeis nesta versão.

Permissões visíveis no grid próprio de Consórcios:

- `consorcios.visualizar` — consulta;
- `consorcios.editar` — gestão.

Enquanto durar a compatibilidade de backend, o salvamento de Perfis espelha essas autorizações nas chaves legadas da Controladoria. O módulo, porém, é de primeiro nível e não pertence ao submenu de FP&A.

Regras funcionais:

- consulta pode consolidar mais de uma empresa selecionada;
- novo cadastro exige uma única empresa;
- status válidos: `ativo`, `contemplado`, `encerrado`, `cancelado`;
- ficha encerrada/cancelada é preservada; não existe delete físico;
- carta atual/reajustada é a base de cálculo quando informada; caso contrário usa carta contratada;
- taxa de administração, fundo de reserva e seguro/outros formam a **taxa do consórcio**;
- juros/encargos ficam separados e são opcionais;
- total estimado do plano = carta base + custos informados;
- parcela média estimada = total estimado / prazo total;
- parcela atual contratual/reajustada permanece separada da média estimada;
- se houver valor pago acumulado, ele é usado no saldo teórico; caso contrário, o saldo é estimado pelas parcelas restantes.

`js/consortium-calculations.js` é a fonte da matemática. A tela não deve duplicar fórmulas paralelas.

**Invariante da v1:** Consórcios não alimenta DRE, Balanço, Fluxo de Caixa, Budget, Forecast ou Imobilizado. Qualquer integração futura deve ser desenhada e documentada antes de alterar lançamentos ou relatórios.

---

## 9. Permutas v2

Permutas é um **módulo operacional de primeiro nível**, posicionado com Contratos e Consórcios. Não pertence à Controladoria/FP&A.

Coleções:

- `permutas` — cadastro, status e ciclo atual;
- `permutaMovimentos` — razão operacional;
- `permutaFechamentos` — memória imutável dos fechamentos.

Permissões próprias:

- `permutas.visualizar`;
- `permutas.cadastrar`;
- `permutas.editar`;
- `permutas.movimentar`;
- `permutas.estornar`;
- `permutas.fechar`;
- `permutas.inativar`.

**Exclusão não é delegável:** delete físico de permuta, movimento ou fechamento é exclusivo do perfil Administrador e exige reautenticação pela senha do usuário administrativo logado.

Regras funcionais:

- CPF/CNPJ de contraparte usa `formatarCpfCnpj()` e `validarCpfCnpj()` de `js/shared.js`;
- CPF/CNPJ mascarado é padrão do SIG; quando aplicável, persistir também a versão somente com dígitos;
- permuta inativa permanece visível no histórico/relatórios, mas não aceita novos movimentos;
- estorno nunca apaga o movimento: grava `estornado`, motivo, usuário e data/hora; a linha permanece visível e riscada;
- totais, saldo e fechamento desconsideram movimentos estornados;
- relatórios devem aceitar intervalo exato de datas além do período global do cabeçalho;
- a carteira consolidada deve permitir abrir a ficha individual da permuta;
- ficha individual mostra cadastro, saldo, movimentos válidos/estornados e histórico de fechamentos;
- fechamento usa somente o ciclo corrente e movimentos válidos;
- fechamento pode gerar lançamento zerador ou preservar saldo;
- se não finalizar, inicia novo ciclo; sem zerador, o saldo de fechamento vira saldo de abertura do ciclo seguinte; com zerador, o novo ciclo começa em zero;
- fechamento pode finalizar a permuta, bloqueando novas movimentações;
- para permutas entre empresas do grupo, status, estorno e movimentos espelhados devem manter simetria entre os dois lados sempre que houver referência de espelho.

---

## 10. Governança, Antifraude e Inadimplência

Governança & Compliance possui visão especializada de **Antifraude & TI** sobre a base auditável já existente de riscos, obrigações, programas/ciclos de auditoria e planos de ação.

- o cockpit antifraude não cria uma segunda base paralela de compliance;
- controles incluem MFA, proteção de endpoint, atualizações, bloqueio de tela, backup, revisão de privilégios, credenciais e validação independente de alterações financeiras;
- achados devem poder virar plano de ação com responsável/prazo;
- ocorrência de fraude deve preservar exposição, perda efetiva, resposta e histórico.

Inadimplência fica na Controladoria, com coleção própria `inadimplenciaTitulos` e permissões separadas de consulta/gestão. Delete físico é proibido; recebido/cancelado preserva histórico.

---

## 11. Dashboard Gerencial v2

O Dashboard v2 é **cockpit de leitura e decisão**, não ledger, razão, DRE ou submódulo de origem.

Arquivos ativos:

- `js/dashboard-v2.js` — ponto de entrada;
- `js/dashboard-cockpit-v2.js` — implementação;
- `dashboard-v2.css` — layout.

Princípios:

- não exibir “Atalhos de Gestão” redundantes;
- cada KPI relevante deve buscar contexto por meta, Budget, Forecast, período anterior ou Last Year quando aplicável;
- widgets visíveis dependem das permissões do módulo de origem;
- clique em resumo deve levar ao detalhe quando existir rota;
- preferências de ordem/visibilidade são pessoais e persistidas em `dashboardPreferencias/{uid}`;
- usuário só pode acessar sua própria preferência no Firestore;
- esconder um widget não altera autorização de dados;
- Balanço no dashboard é posição de fechamento, não soma de meses;
- Consórcios, Permutas e Vendas podem aparecer no cockpit sem gerar integração contábil automática.

O Dashboard pode mostrar: DRE/resultado, evolução mensal, Balanço, Caixa, Inadimplência, Consórcios, Permutas, Vendas e desvios vs Budget.

---

## 12. Vendas & Comissões

Vendas é um **módulo comercial de primeiro nível**, depois de Permutas. Não pertence à Controladoria & FP&A.

Coleções:

- `vendedores`;
- `vendas`.

Permissões:

- `vendas.visualizar`;
- `vendas.lancar`;
- `vendas.editar`;
- `vendas.vendedores`;
- `vendas.comissoes`.

Cadastro do vendedor define:

- meta mensal;
- taxa padrão de comissão;
- base da comissão: `venda` ou `faturamento`;
- status.

### 12.1 Snapshot da comissão

Cada venda preserva a regra usada no momento da operação. Alterar vendedor depois não pode recalcular silenciosamente histórico anterior.

Campos centrais do snapshot:

- `baseComissao`;
- `comissaoPct`;
- `comissaoBaseValor`;
- `comissaoValor`;
- `comissaoStatus`.

### 12.2 Venda x faturamento

- vendedor com base `venda`: comissão sobre venda confirmada;
- vendedor com base `faturamento`: comissão sobre valor efetivamente faturado;
- faturamento parcial é permitido;
- valor faturado nunca pode superar valor da venda;
- sem faturamento, comissão por faturamento fica `aguardando_faturamento`;
- status financeiros seguintes: `provisionada`, `aprovada`, `paga`.

Quem somente registra venda não pode definir no backend taxa/base diferente do vendedor. A interface também bloqueia taxa/status financeiro sem `vendas.comissoes`, mas a Rule é a barreira efetiva.

Venda cancelada permanece em histórico. Delete físico de venda e vendedor é bloqueado; vendedor deve ser inativado.

### 12.3 Performance por vendedor

`js/sales-performance.js` adiciona cockpit comparativo por vendedor com:

- Venda;
- Faturamento;
- Meta;
- atingimento;
- Faturado/Venda;
- ticket médio;
- comissão;
- líder de vendas;
- maior atingimento;
- maior gap venda x faturamento;
- maior comissão.

Clicar na linha de performance filtra a carteira detalhada do vendedor.

**Invariante:** Vendas não alimenta DRE, Balanço, Caixa, Budget ou Forecast automaticamente. Integração futura exige desenho contábil e atualização de Rules/QA/documentação.

---

## 13. Release

Nenhuma versão estrutural deve chegar à `main` enquanto:

- módulos ativos não estiverem completos;
- documentação estiver divergente;
- `SIG Quality Check` não estiver verde;
- `SIG Firebase Contract Check` não estiver verde;
- `SIG Permissions Contract Check` não estiver verde quando permissões mudarem;
- contratos específicos dos módulos alterados não estiverem verdes;
- Rules necessárias não estiverem versionadas;
- não houver plano claro para publicar as Rules no Firebase.

Após merge, confirmar GitHub Pages e, quando houver alteração de Rules, republicar Firebase e testar autenticado.

Para detalhes de Dashboard v2 e Vendas, consultar `docs/dashboard-v2-vendas.md`.
