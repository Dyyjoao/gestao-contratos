# SIG — Manual Mestre de Arquitetura e Regras

> Documento de invariantes do Sistema Integrado de Gestão (SIG).  
> Atualizado em: 01/09/2026 — Plano de Contas v6 + Balanço gerencial + Consórcios v1.

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

Permissões:

- `controladoria.consorciosVisualizar` — consulta;
- `controladoria.consorciosEditar` — criação/edição;
- Administração FP&A também autoriza o módulo.

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

## 9. Release

Nenhuma versão estrutural deve chegar à `main` enquanto:

- módulos ativos não estiverem completos;
- documentação estiver divergente;
- `SIG Quality Check` não estiver verde;
- `SIG Firebase Contract Check` não estiver verde;
- `SIG Permissions Contract Check` não estiver verde quando permissões mudarem;
- `SIG Consorcios Contract Check` não estiver verde enquanto Consórcios fizer parte da baseline;
- Rules necessárias não estiverem versionadas;
- não houver plano claro para publicar as Rules no Firebase.

Após merge, confirmar GitHub Pages e, quando houver alteração de Rules, republicar Firebase e testar autenticado.