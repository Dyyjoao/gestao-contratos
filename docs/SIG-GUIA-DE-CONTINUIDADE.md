# SIG — Guia Operacional de Continuidade

**Finalidade:** retomar o SIG em outra conversa, IA, equipe, computador, repositório ou hospedagem sem depender de memória informal.  
**Data-base:** 02/09/2026 — Plano v6 + Balanço + Consórcios + Permutas v2 + Governança/Antifraude + Inadimplência + Dashboard v2 + Vendas.

---

## 1. Ordem de leitura

1. `AGENTS.md`;
2. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`;
3. `docs/SIG-MANUAL-MESTRE.md`;
4. este Guia;
5. `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`;
6. `SECURITY.md`;
7. `docs/dashboard-v2-vendas.md` quando a mudança envolver Dashboard ou Vendas;
8. `app.js`;
9. `js/controllership-router.js`;
10. `js/profiles.js` quando houver módulos, abas ou autorizações;
11. `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc`;
12. `.github/workflows/`.

Na Controladoria, nunca deduzir o módulo ativo pelo nome do arquivo: conferir o roteador.

---

## 2. Estado estrutural atual

Plano ativo: `js/ctrl-chart-accounts-v6.js`.

Máscara: `#.##.##.####`.

Hierarquia: `Raiz → Sintética N1 → Sintética N2 → Analítica`.

O Plano oferece árvore expansível, filtro Ativas/Inativas/Todas, inativação, reativação, exclusão segura de teste/legado e cópia de estrutura v6.

Balanço atual possui visão mensal com fechamento final do trimestre/ano e comparativo anual Atual x Last Year.

### Módulos de primeiro nível relevantes

Ordem lógica atual na área gerencial/operacional:

- Dashboard;
- Contratos;
- Consórcios;
- Permutas;
- Vendas & Comissões;
- Controladoria & FP&A;
- Governança & Compliance;
- Administração conforme permissão.

Consórcios, Permutas e Vendas **não pertencem ao submenu da Controladoria**.

### Consórcios

Consórcios ativo: `js/ctrl-consorcios-v1.js`. Matemática: `js/consortium-calculations.js`. Persistência: `consorcios`.

A grade de Perfis exibe Consórcios como módulo próprio (`visualizar` / `editar`). As chaves legadas de Controladoria continuam apenas como espelho técnico de compatibilidade enquanto roteador/Rules ainda as reconhecerem.

A carteira é resumo; a ficha mostra composição financeira, contemplação e cronograma teórico. Cronograma é projeção, nunca extrato real.

### Permutas

Permutas v2 usa:

- `permutas`;
- `permutaMovimentos`;
- `permutaFechamentos`.

Possui CPF/CNPJ padronizado, ficha individual, intervalo exato de relatório, estorno com justificativa, inativação, fechamento por ciclo e delete físico exclusivo de Administrador com reautenticação.

Movimento estornado continua visível e não compõe saldo/fechamento.

### Governança, Antifraude e Inadimplência

Governança reaproveita a estrutura auditável existente de compliance e possui cockpit Antifraude & TI.

Inadimplência fica na Controladoria em `js/ctrl-delinquency-v1.js`, coleção `inadimplenciaTitulos`, com consulta e gestão separadas por permissão. Não há delete físico de título.

### Dashboard Gerencial v2

Entrada:

- `js/dashboard-v2.js`;
- `js/dashboard-cockpit-v2.js`;
- `dashboard-v2.css`.

O Dashboard v2 é configurável por usuário e persiste ordem/visibilidade em `dashboardPreferencias/{uid}`.

Não existe bloco **Atalhos de Gestão**: o menu é curto e continua sendo a navegação primária.

O cockpit pode combinar, conforme permissões:

- Receita/OPEX/Resultado/Margem;
- evolução mensal;
- Budget/Forecast e desvios;
- Balanço e evolução patrimonial;
- Caixa D+30/D+60/D+90;
- Inadimplência/Aging;
- Consórcios;
- Permutas;
- Vendas & Comissões.

**Dashboard é consumidor, não fonte.** Exibir dado operacional/comercial nele não cria integração contábil automática.

### Vendas & Comissões

Arquivos:

- `js/sales.js`;
- `js/sales-guard.js`;
- `js/sales-performance.js`;
- `sales.css`;
- `sales-performance.css`.

Coleções:

- `vendedores`;
- `vendas`.

Cadastro do vendedor possui meta, taxa padrão e flag de base de comissão:

- `venda` — venda confirmada;
- `faturamento` — valor efetivamente faturado.

Faturamento parcial é permitido. A venda guarda snapshot da regra da comissão e alteração posterior do vendedor não reescreve histórico.

O cockpit comercial exibe Venda x Faturamento x Meta por vendedor, atingimento, Faturado/Venda, ticket médio, comissão e exceções gerenciais.

---

## 3. Como retomar desenvolvimento

1. confirmar branch e HEAD;
2. comparar com `main`;
3. ler o roteador e os módulos afetados;
4. buscar consumidores indiretos antes de alterar formatos ou regras;
5. atualizar documentação no mesmo pacote;
6. rodar QA;
7. promover somente o HEAD validado.

**Toda nova aba ou módulo navegável exige, na mesma alteração, revisão da grade de Perfis em `js/profiles.js`, proteção real de abertura/ações e atualização do `SIG Permissions Contract Check`. Um menu visível ou oculto, sozinho, nunca é controle de autorização suficiente.**

Mudança de Plano exige revisar máscara, árvore, Balanço, DRE, Input, Budget/Forecast, Centros, Rules e QA.

Mudança de Consórcios exige revisar módulo, cálculo, exportação, roteador, Perfis, Rules quando aplicável, QA e documentação.

Mudança de Dashboard exige revisar `dashboard-v2.js`, `dashboard-cockpit-v2.js`, CSS, fontes oficiais consumidas, permissões dos widgets, Rules de preferência e documentação.

Mudança de Vendas exige revisar `sales.js`, `sales-guard.js`, `sales-performance.js`, roteador, Perfis, Rules, QA e documentação.

**Não recolocar Consórcios, Permutas ou Vendas no submenu da Controladoria sem decisão arquitetural explícita.**

**Não integrar Consórcios, Permutas ou Vendas a DRE, Balanço, Caixa, Budget, Forecast ou Imobilizado sem decisão arquitetural explícita.**

**Não apresentar projeção como histórico real.**

---

## 4. Histórico e exclusão

Plano de Contas: conta que teve vida real deve ser inativada; exclusão é apenas para teste/erro sem referência.

Consórcios: usar Encerrado/Cancelado para preservar histórico.

Permutas: estorno preserva lançamento; delete físico só Administrador + senha.

Inadimplência: recebido/cancelado preserva título; delete bloqueado.

Vendas: venda incorreta deve ser cancelada; vendedor deve ser inativado; delete físico de vendedor/venda é bloqueado.

---

## 5. Firebase

GitHub Pages publica frontend, mas não publica `firestore.rules` nem `storage.rules`.

A baseline atual deve conter Rules para, entre outras:

- `imobilizados`;
- `planoContasGerencial`;
- `consorcios`;
- `permutas`, `permutaMovimentos`, `permutaFechamentos`;
- `inadimplenciaTitulos`;
- `dashboardPreferencias`;
- `vendedores`;
- `vendas`.

### Dashboard

`dashboardPreferencias/{uid}` pertence exclusivamente ao usuário autenticado correspondente ao ID do documento. Preferência não pode virar canal de leitura/escrita entre usuários.

### Vendas

- `vendas.visualizar` e demais ações concedem consulta conforme perfil;
- `vendas.lancar` permite criação dentro do escopo de empresa/grupo;
- sem `vendas.comissoes`, Rule valida taxa/base contra o vendedor cadastrado;
- `vendas.vendedores` gere vendedor/meta/regra;
- `vendas.comissoes` controla camada financeira da comissão;
- cálculo de comissão deve permanecer coerente com base e percentual;
- delete físico de vendedor/venda é bloqueado.

Quando `firestore.rules` mudar, publicar a Rule completa no Firebase antes de considerar a release encerrada.

---

## 6. QA mínimo pós-release

### Plano / Relatórios

- validar `1.01 → 1.01.01 → 1.01.01.0001`;
- validar expandir/recolher, filtros, inativar/reativar e exclusão segura;
- Balanço deve mostrar N1 → N2 → Analítica;
- trimestre/ano devem ter coluna final de fechamento sem somar saldos mensais;
- comparativo anual deve usar dezembro atual x dezembro Last Year;
- DRE e Input devem continuar respeitando a hierarquia v6.

### Consórcios

- menu principal após Contratos;
- fora do submenu Controladoria;
- bloco próprio em Perfis;
- consulta e gestão segregadas;
- ficha e cronograma abrem;
- cronograma identificado como projeção;
- nenhuma integração automática com contabilidade/caixa/planejamento.

### Permutas

- menu de primeiro nível;
- permissões próprias;
- CPF/CNPJ mascarado;
- estorno exige motivo e preserva linha;
- fechamento ignora estornos;
- inativa não aceita novo movimento;
- delete só Administrador reautenticado;
- exclusão deve refletir imediatamente na UI.

### Governança / Inadimplência

- cockpit Antifraude carrega conforme perfil;
- ciclo mensal/planos de ação permanecem auditáveis;
- Inadimplência calcula aging e índice;
- consulta e gestão respeitam permissões diferentes.

### Dashboard v2

- nenhum “Atalhos de Gestão”;
- abrir Configurar dashboard;
- ocultar/exibir widget;
- subir/descer ordem;
- salvar e recarregar preferência do mesmo usuário;
- outro usuário não herda configuração;
- Balanço mostra posição, equação e LY;
- gráficos mensais carregam;
- clicar em resumo abre detalhe correspondente;
- Consórcios/Permutas/Vendas aparecem somente com permissão;
- Dashboard não cria lançamentos em módulos de origem.

### Vendas & Comissões

- menu após Permutas e fora de Controladoria;
- bloco próprio em Perfis;
- vendedor base Venda calcula comissão sobre venda;
- vendedor base Faturamento aguarda faturamento e calcula sobre valor faturado;
- faturamento parcial funciona;
- mudança posterior da regra do vendedor não altera snapshot antigo;
- usuário sem `vendas.comissoes` não consegue alterar taxa/status financeiro;
- aprovação/pagamento respeitam permissão;
- venda cancelada sai dos totais sem ser apagada;
- mapa por vendedor mostra Venda/Faturamento/Meta e indicadores;
- clique no vendedor filtra a tabela detalhada.

### Firebase

- Rules correspondem ao SHA da `main`;
- coleções novas não retornam `permission-denied` para perfis autorizados;
- perfis não autorizados permanecem bloqueados;
- publicação de Pages e publicação de Rules são verificadas separadamente.

---

## 7. Rollback

Se a versão falhar:

1. não apagar histórico;
2. reverter frontend para último SHA estável;
3. reverter Rules apenas com versão completa conhecida;
4. publicar frontend e Rules correspondentes;
5. registrar causa e correção.

Se já houver dados persistidos no formato novo, tratar rollback como migração controlada.

---

## 8. Princípios

- uma fonte de verdade por regra;
- código e documentação mudam juntos;
- toda nova aba/módulo entra também na grade de Perfis e no QA de permissões;
- regras de negócio não ficam só na UI;
- matemática reutilizável fica fora da tela;
- dados contábeis não são alterados para mascarar bug visual;
- integração crítica é fail-closed;
- módulo independente não gera lançamentos sem desenho aprovado;
- Dashboard cruza visões sem virar fonte de lançamento;
- arquivos legados não definem comportamento ativo;
- histórico real não é apagado;
- projeção não é apresentada como histórico realizado;
- merge somente depois de QA do HEAD final.
