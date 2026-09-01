# QA — Controladoria & FP&A

Checklist mínimo antes de merge/publicação de mudança estrutural.

**Baseline:** 01/09/2026 — Plano de Contas v6.

## 1. Automático

- [ ] `node --check` em todos os JavaScript;
- [ ] imports dinâmicos atuais resolvem;
- [ ] Chrome headless/smoke passa;
- [ ] Plano v6, Budget e Forecast executam `abrir()` de verdade no browser test;
- [ ] roteador aponta para os módulos aprovados;
- [ ] Firebase Contract Check passa;
- [ ] Rules são revisadas quando persistência/permissões mudam.

## 2. Plano de Contas v6

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

## 3. Balanço Patrimonial

- [ ] raízes 1 e 2 aparecem separadamente;
- [ ] estrutura exibida é Raiz → N1 → N2 → Analítica;
- [ ] duas Sintéticas N1 sob a mesma raiz não se misturam;
- [ ] N2 consolida somente suas Analíticas descendentes;
- [ ] N1 consolida todas as N2/Analíticas descendentes;
- [ ] Ativo/Passivo usam posição de fechamento, sem somar meses;
- [ ] contas redutoras são apresentadas pelo multiplicador;
- [ ] Imobilizado substitui saldo manual nas contas automáticas;
- [ ] consolidação multiempresa agrupa Analíticas pelo código;
- [ ] Sintética ausente pode ser reconstruída para reconciliação;
- [ ] legado ainda preservado participa da raiz;
- [ ] diferença Ativo − Passivo/PL continua sendo calculada.

## 4. DRE

- [ ] por Centro de Custo respeita árvore N1 → N2 → Analítica;
- [ ] Sintéticas expandem/recolhem corretamente;
- [ ] consolidada por código apresenta N1 → N2 → Analítica;
- [ ] consolidação multiempresa agrupa por código, não por ID;
- [ ] raízes 1, 2 e 9 não entram no resultado financeiro;
- [ ] multiplicador de resultado continua central;
- [ ] divergência de nome/natureza entre empresas continua sinalizada;
- [ ] depreciação automática aparece em Budget/Forecast sem duplicar projeção manual.

## 5. Input

- [ ] somente Analíticas vigentes são lançáveis;
- [ ] Sintéticas permanecem não lançáveis independentemente da profundidade;
- [ ] contas patrimoniais usam CC-BALANCO invisível;
- [ ] Estatísticas usam CC-ESTATISTICO invisível;
- [ ] conta automática do Imobilizado fica bloqueada para input manual;
- [ ] competência fechada respeita bloqueio vigente.

## 6. Budget / Forecast / Premissas

- [ ] Budget abre e salva versão;
- [ ] Forecast abre e usa Realizado fechado + futuro;
- [ ] árvore de contas com dois níveis sintéticos não duplica valores;
- [ ] Centros de Custo continuam vinculando Analíticas por ID;
- [ ] Premissas respeitam vigência por competência;
- [ ] específica por CC prevalece sobre corporativa;
- [ ] Imobilizado indisponível não vira lista vazia silenciosa.

## 7. Imobilizado & CAPEX

- [ ] coleção `imobilizados` carrega com Rules publicadas;
- [ ] conta do Ativo é raiz 1 não redutora;
- [ ] depreciação acumulada é raiz 1 redutora;
- [ ] despesa de depreciação é raiz 4 não redutora;
- [ ] Conta × CC do planejamento é válida;
- [ ] valor residual nunca é ultrapassado;
- [ ] fim da vida útil interrompe depreciação sem baixar o bem;
- [ ] falha de Rules interrompe os cálculos dependentes.

## 8. Firestore / segurança

- [ ] `firestore.rules` contém `imobilizados`;
- [ ] `planoContasGerencial` permite delete somente via `fpaPlano()` + documento acessível;
- [ ] usuário sem permissão de Plano não consegue delete direto;
- [ ] aplicação checa referências antes do delete;
- [ ] Grupo/Empresa não podem ser trocados em update;
- [ ] Rules da versão foram efetivamente publicadas, não apenas commitadas.

## 9. Contexto e relatórios auxiliares

- [ ] Fluxo de Caixa bloqueia múltiplas empresas;
- [ ] Prestação bloqueia múltiplas empresas;
- [ ] Dashboard não mistura Balanço/Estatísticas em OPEX;
- [ ] Minha Mesa usa primeiro dia real de caixa negativo, não rótulo fixo D+90.

## 10. Critério de aprovação

Não aprovar merge quando houver:

- erro de sintaxe/import;
- rota apontando para versão antiga;
- máscara/documentação divergentes;
- cálculo silencioso com base crítica indisponível;
- exclusão sem validação de referências;
- Rule necessária ainda ausente do pacote;
- teste funcional crítico não reproduzido no HEAD final.
