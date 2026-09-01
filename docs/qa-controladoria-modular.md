# QA — Controladoria & FP&A

Checklist mínimo antes de merge/publicação de mudança estrutural.

**Baseline:** 01/09/2026 — Plano de Contas v6 + permissões modulares + visões gerenciais do Balanço + Consórcios v1.

## 1. Automático

- [ ] `node --check` em todos os JavaScript;
- [ ] imports dinâmicos atuais resolvem;
- [ ] Chrome headless/smoke passa;
- [ ] Plano v6, Budget, Forecast e Consórcios executam `abrir()` de verdade no browser test;
- [ ] roteador aponta para os módulos aprovados;
- [ ] Firebase Contract Check passa;
- [ ] Permissions Contract Check passa;
- [ ] Consorcios Contract Check passa;
- [ ] Rules são revisadas quando persistência/permissões de dados mudam.

## 2. Permissões da Controladoria

- [ ] perfil exibe opções **Visualizar DRE Gerencial** e **Visualizar Balanço Patrimonial**;
- [ ] perfil exibe **Visualizar consórcios** e **Gerir consórcios**;
- [ ] marcar qualquer ação da Controladoria continua marcando `Visualizar` como permissão-base;
- [ ] DRE aparece no submenu somente quando `controladoria.dre`, Administração FP&A ou compatibilidade legada autorizam;
- [ ] Balanço aparece no submenu somente quando `controladoria.balanco`, Administração FP&A ou compatibilidade legada autorizam;
- [ ] Consórcios aparece somente com `consorciosVisualizar`, `consorciosEditar` ou Administração FP&A;
- [ ] usuário apenas com `consorciosVisualizar` consulta a carteira, mas não vê ações de edição;
- [ ] Input aparece somente para perfil com Realizado/Importar/Administração FP&A;
- [ ] Budget, Forecast, Premissas, Imobilizado, Plano, Centros, Caixa, Prestação e Fechamento respeitam suas ações específicas;
- [ ] trocar de Administrador para perfil limitado sem recarregar a página recalcula o submenu;
- [ ] item escondido também é bloqueado quando acionado programaticamente;
- [ ] módulos importados dinamicamente não reutilizam a mesma instância entre usuários/perfis diferentes;
- [ ] perfil legado sem chaves `dre`/`balanco` mantém `controladoria.visualizar` até ser editado e salvo;
- [ ] Consórcios não recebe fallback legado por `controladoria.visualizar`;
- [ ] após salvar um perfil na versão atual, as novas permissões ficam explicitamente gravadas como `true`/`false`.

## 3. Plano de Contas v6

- [ ] máscara vigente é `#.##.##.####`;
- [ ] raiz aceita mais de uma Sintética N1;
- [ ] N1 aceita mais de uma Sintética N2;
- [ ] N2 aceita Analíticas;
- [ ] código é automático e sequencial por pai;
- [ ] Sintética não é lançável;
- [ ] Analítica é folha lançável;
- [ ] natureza contábil continua centralizada em `account-mask.js`;
- [ ] conta redutora é definida por natureza oposta à raiz;
- [ ] seta recolhe/expande N1 e N2;
- [ ] filtro Ativas mostra somente vigentes no exercício;
- [ ] filtro Inativas mostra contas fora da vigência atual;
- [ ] filtro Todas mostra ambos os estados;
- [ ] inativar conta sem uso funciona;
- [ ] depois de inativa, ação vira **Reativar**;
- [ ] reativar remove `inativaAPartirExercicio` e restaura status ativo;
- [ ] inativação/reativação de Sintética abrange o ramo;
- [ ] inativação é bloqueada se houver uso atual/futuro;
- [ ] `Limpar legado/testes` identifica contas fora do contrato v6;
- [ ] exclusão é bloqueada se houver qualquer referência;
- [ ] exclusão de conta de teste sem uso funciona após Rules publicadas;
- [ ] conta com histórico deve ser inativada, não excluída;
- [ ] cópia entre empresas copia apenas estrutura v6 e preserva conflitos.

### Caso mínimo de hierarquia

Criar e validar:

1. `1.01` — Ativo Circulante;
2. `1.01.01` — Disponibilidades;
3. `1.01.01.0001` — Caixa;
4. `1.02` — Ativo Não Circulante;
5. `2.01` — Passivo Circulante;
6. `2.02` — Passivo Não Circulante;
7. `2.03` — Patrimônio Líquido.

Cada N1 deve permitir novas N2 independentes.

## 4. Balanço Patrimonial

- [ ] raízes 1 e 2 aparecem separadamente;
- [ ] estrutura exibida é Raiz → N1 → N2 → Analítica;
- [ ] duas Sintéticas N1 sob a mesma raiz não se misturam;
- [ ] N2 consolida somente suas Analíticas descendentes;
- [ ] N1 consolida todas as N2/Analíticas descendentes;
- [ ] Ativo/Passivo usam posição de fechamento, sem somar meses;
- [ ] primeira coluna permanece delimitada e não ocupa desnecessariamente a maior parte da tela;
- [ ] mês isolado mostra apenas a competência escolhida;
- [ ] trimestre mostra os três meses e uma coluna final `Total Tn`;
- [ ] `Total Tn` é igual à posição do último mês do trimestre, nunca à soma dos três meses;
- [ ] exercício completo mostra Jan–Dez e `Total Ano` ao final;
- [ ] `Total Ano` é igual à posição de dezembro, nunca à soma dos doze meses;
- [ ] Excel e PDF preservam as colunas de fechamento exibidas na tela;
- [ ] visão **Comparativo anual** mostra Ano atual, Last Year, Variação R$ e Variação %;
- [ ] Ano atual e Last Year usam posição de dezembro dos respectivos exercícios;
- [ ] Variação R$ = Atual − LY;
- [ ] Variação % usa o módulo de LY como base;
- [ ] LY zero + Atual diferente de zero mostra percentual não aplicável (`—`);
- [ ] comparativo anual inclui contas vigentes no ano atual ou no ano anterior;
- [ ] contas redutoras são apresentadas pelo multiplicador;
- [ ] Imobilizado substitui saldo manual nas contas automáticas;
- [ ] consolidação multiempresa agrupa Analíticas pelo código;
- [ ] Sintética ausente pode ser reconstruída para reconciliação;
- [ ] legado ainda preservado participa da raiz;
- [ ] diferença Ativo − Passivo/PL continua sendo calculada nas duas visões.

## 5. DRE

- [ ] por Centro de Custo respeita árvore N1 → N2 → Analítica;
- [ ] Sintéticas expandem/recolhem corretamente;
- [ ] consolidada por código apresenta N1 → N2 → Analítica;
- [ ] consolidação multiempresa agrupa por código, não por ID;
- [ ] raízes 1, 2 e 9 não entram no resultado financeiro;
- [ ] multiplicador de resultado continua central;
- [ ] divergência de nome/natureza entre empresas continua sinalizada;
- [ ] depreciação automática aparece em Budget/Forecast sem duplicar projeção manual.

## 6. Input

- [ ] somente Analíticas vigentes são lançáveis;
- [ ] Sintéticas permanecem não lançáveis independentemente da profundidade;
- [ ] contas patrimoniais usam CC-BALANCO invisível;
- [ ] Estatísticas usam CC-ESTATISTICO invisível;
- [ ] conta automática do Imobilizado fica bloqueada para input manual;
- [ ] competência fechada respeita bloqueio vigente.

## 7. Budget / Forecast / Premissas

- [ ] Budget abre e salva versão;
- [ ] Forecast abre e usa Realizado fechado + futuro;
- [ ] árvore de contas com dois níveis sintéticos não duplica valores;
- [ ] Centros de Custo continuam vinculando Analíticas por ID;
- [ ] Premissas respeitam vigência por competência;
- [ ] específica por CC prevalece sobre corporativa;
- [ ] Imobilizado indisponível não vira lista vazia silenciosa.

## 8. Imobilizado & CAPEX

- [ ] coleção `imobilizados` carrega com Rules publicadas;
- [ ] conta do Ativo é raiz 1 não redutora;
- [ ] depreciação acumulada é raiz 1 redutora;
- [ ] despesa de depreciação é raiz 4 não redutora;
- [ ] Conta × CC do planejamento é válida;
- [ ] valor residual nunca é ultrapassado;
- [ ] fim da vida útil interrompe depreciação sem baixar o bem;
- [ ] falha de Rules interrompe os cálculos dependentes.

## 9. Consórcios v1

- [ ] módulo abre em `pagina-ctrl-consorcios-v1`;
- [ ] carteira pode ser visualizada em uma ou várias empresas selecionadas;
- [ ] novo cadastro exige exatamente uma empresa;
- [ ] status disponíveis: Ativo, Contemplado, Encerrado e Cancelado;
- [ ] filtro padrão mostra Ativos + Contemplados;
- [ ] busca encontra descrição, administradora, grupo, cota, bem e empresa;
- [ ] KPIs mostram ativos, contemplados, crédito atual, parcela mensal e saldo teórico;
- [ ] carta atual substitui carta contratada como base quando informada;
- [ ] taxa do consórcio = Administração + Fundo de reserva + Seguro/outros;
- [ ] juros/encargos permanecem separados da taxa do consórcio;
- [ ] total estimado = carta atual + taxa do consórcio + juros/encargos;
- [ ] parcela média = total estimado / prazo total;
- [ ] parcela atual informada fica visível separadamente da média estimada;
- [ ] parcelas restantes = prazo total − parcelas pagas;
- [ ] quando há valor pago acumulado, saldo teórico = total estimado − valor pago acumulado;
- [ ] sem valor pago acumulado, saldo teórico usa parcela média × parcelas restantes;
- [ ] contemplado exige data de contemplação no cadastro atual;
- [ ] crédito utilizado não ultrapassa a carta atual;
- [ ] usuário apenas de consulta não consegue criar/editar;
- [ ] coleção `consorcios` não permite delete físico;
- [ ] Consórcios v1 não altera DRE, Balanço, Caixa, Budget, Forecast ou Imobilizado.

## 10. Firestore / segurança

- [ ] `firestore.rules` contém `imobilizados`;
- [ ] `firestore.rules` contém `consorcios`;
- [ ] leitura de `consorcios` exige `consorciosVisualizar`, `consorciosEditar` ou Administração FP&A;
- [ ] create/update de `consorcios` exige `consorciosEditar` ou Administração FP&A;
- [ ] delete de `consorcios` é bloqueado;
- [ ] `planoContasGerencial` permite delete somente via `fpaPlano()` + documento acessível;
- [ ] usuário sem permissão de Plano não consegue delete direto;
- [ ] aplicação checa referências antes do delete de conta;
- [ ] Grupo/Empresa não podem ser trocados em update;
- [ ] Rules da versão foram efetivamente publicadas, não apenas commitadas.

## 11. Contexto e relatórios auxiliares

- [ ] Fluxo de Caixa bloqueia múltiplas empresas;
- [ ] Prestação bloqueia múltiplas empresas;
- [ ] Dashboard não mistura Balanço/Estatísticas em OPEX;
- [ ] Minha Mesa usa primeiro dia real de caixa negativo, não rótulo fixo D+90.

## 12. Critério de aprovação

Não aprovar merge quando houver:

- erro de sintaxe/import;
- rota apontando para versão antiga;
- perfil limitado herdando submenu de usuário anterior;
- módulo acessível sem sua permissão funcional;
- máscara/documentação divergentes;
- cálculo silencioso com base crítica indisponível;
- Consórcios alimentando módulo contábil/planejamento sem decisão arquitetural explícita;
- exclusão sem validação de referências;
- Rule necessária ainda ausente do pacote;
- teste funcional crítico não reproduzido no HEAD final.