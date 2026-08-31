# SIG — Guia Operacional de Continuidade

**Sistema Integrado de Gestão (SIG)**  
**Finalidade:** permitir retomada segura do desenvolvimento em outro chat, outra IA, outro desenvolvedor, outro computador, outro repositório ou outra hospedagem sem depender de memória informal.  
**Data-base deste guia:** 31/08/2026.

---

## 1. Regra de ouro

O SIG não pode depender da memória de uma conversa.

A fonte de verdade deve ser lida nesta ordem:

1. código da branch/commit que será alterado;
2. `AGENTS.md`;
3. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`;
4. `docs/SIG-MANUAL-MESTRE.md`;
5. este `docs/SIG-GUIA-DE-CONTINUIDADE.md`;
6. `SECURITY.md`, `firestore.rules` e `storage.rules` quando houver dados, permissões ou publicação;
7. histórico Git apenas para entender evolução e recuperar decisões anteriores.

Conversa, memória de IA e anotações externas são apoio, nunca fonte única de verdade.

---

## 2. Checkpoint de recuperação preservado

Antes da consolidação iniciada em 31/08/2026, o estado cumulativo mais avançado estava em:

```text
chatgpt/mascara-contas-balanco-centros
commit db2c1835505aea7477503911108069234d6ffda7
```

Esse estado foi congelado em:

```text
archive/sig-pre-consolidacao-2026-08-31
```

Esse snapshot existe para recuperação. Não desenvolver diretamente nele e não reescrever seu histórico.

Na conferência de branches feita antes da consolidação, as principais branches anteriores de Administração, contexto global, DRE, Input, Estatísticas, Compliance, apresentação, mobile e fluxos operacionais estavam contidas na linha cumulativa acima. A única divergência encontrada em `chatgpt/input-v4-limpeza-legado` era um commit `noop`, sem alteração de arquivos.

---

## 3. Como retomar o projeto com segurança

Antes de qualquer nova alteração estrutural:

1. identificar a `main` atual e o último commit de produção;
2. identificar a branch de desenvolvimento mais recente;
3. comparar a branch de desenvolvimento com a `main`;
4. conferir se existem branches divergentes com commits funcionais exclusivos;
5. ler `AGENTS.md`, Dossiê, Manual Mestre e este guia;
6. conferir a rota realmente ativa em `js/controllership-router.js` — arquivos com versão maior podem existir sem estar ativos;
7. conferir `firestore.rules` antes de criar nova coleção ou alterar persistência;
8. criar um checkpoint/branch de recuperação antes de uma consolidação grande;
9. trabalhar em branch própria;
10. só promover para `main` após QA.

Nunca assumir que "arquivo mais novo" significa "módulo publicado". A rota ativa é a fonte de verdade de execução.

---

## 4. Estado funcional consolidado até o checkpoint

### 4.1 Contexto global

O cabeçalho controla Grupo, Empresa(s), Exercício e Período. Telas de lançamento normalmente exigem uma empresa; relatórios podem consolidar empresas.

### 4.2 Plano de Contas

Máscara estrutural:

```text
1 Ativo
2 Passivo
3 Receita
4 Despesa
9 Estatística

#.##       = Sintética
#.##.####  = Analítica
```

Sintética nunca recebe lançamento. Analítica é folha lançável.

O Plano v5 já introduziu:

- vigência por exercício;
- inativação temporal sem apagar histórico;
- cópia de estrutura entre empresas sem copiar saldos/planejamento;
- preservação de códigos existentes no destino.

### 4.3 Natureza contábil e multiplicadores

A regra central está em `js/account-mask.js`.

| Raiz | Natureza padrão | Apresentação normal | Resultado |
|---|---|---:|---:|
| 1 Ativo | Devedora | +1 | não compõe DRE |
| 2 Passivo | Credora | +1 | não compõe DRE |
| 3 Receita | Credora | +1 | +1 |
| 4 Despesa | Devedora | +1 de apresentação | -1 no resultado |
| 9 Estatística | Neutra | valor informativo | 0 no resultado |

Conta redutora é identificada pela natureza oposta à natureza padrão da raiz. O texto `(-)` no nome pode ajudar o usuário, mas não define a regra.

Exemplo:

```text
1.01.0001 Máquinas e Equipamentos       Devedora  => +1
1.01.0002 Depreciação Acumulada         Credora   => -1
```

Se os saldos brutos forem 1.000.000 e 300.000:

```text
Imobilizado líquido = 1.000.000 + (300.000 × -1) = 700.000
```

**Invariante crítica:** multiplicadores são de apresentação/cálculo gerencial. Não modificar o saldo bruto armazenado para "corrigir" sinal de relatório.

### 4.4 Centros técnicos

Estatística:

```text
__cc_estatistico__
```

Balanço:

```text
__cc_balanco__
```

Centros técnicos existem para manter chaves consistentes e não devem aparecer como Centros de Custo operacionais normais.

### 4.5 Budget e Forecast

Budget é anual, possui ciclo e versões. Forecast combina Realizado fechado com projeção futura.

CAPEX não deve ser tratado como despesa operacional apenas para caber na DRE. Investimento é controlado separadamente; depreciação/amortização é que chega à DRE conforme a conta configurada.

### 4.6 Imobilizado / depreciação

O motor mensal de depreciação está centralizado em `js/asset-depreciation.js` e já contempla:

- valor de aquisição;
- valor residual;
- vida útil/taxa;
- data disponível para uso/início de depreciação;
- baixa;
- depreciação mensal;
- depreciação acumulada;
- valor contábil líquido;
- mapeamento para conta de despesa de depreciação;
- mapeamento para ativo bruto e depreciação acumulada no Balanço.

Regra contábil: bem em implantação não começa a depreciar antes de estar disponível para uso.

---

## 5. Dados: o que uma atualização nunca pode fazer

Uma atualização de frontend não pode:

- apagar documentos existentes;
- trocar `grupoId` ou `empresaId` silenciosamente;
- converter saldo bruto em saldo apresentado e sobrescrever o original;
- somar duplicidades silenciosamente;
- reutilizar código de conta automaticamente;
- transformar Sintética em lançável;
- remover histórico por causa de inativação;
- apagar Budget/Forecast anterior ao criar nova versão;
- misturar CC técnico com CC operacional;
- incluir Estatística no resultado financeiro;
- iniciar depreciação de ativo antes da entrada em operação.

Quando um modelo de dados evoluir, usar default compatível, migração idempotente e possibilidade de rollback.

---

## 6. Hospedagem, domínio e banco

O frontend e o banco são independentes.

Hoje o frontend pode estar no GitHub Pages, mas o banco está no Firebase/Firestore. Migrar o frontend para Vercel, Netlify, Firebase Hosting, Cloudflare Pages ou hospedagem paga não apaga a base desde que a aplicação continue apontando para o mesmo projeto Firebase.

Para troca de hospedagem:

1. congelar release estável;
2. guardar tag/commit de rollback;
3. configurar o novo host com o mesmo frontend aprovado;
4. configurar domínio e HTTPS;
5. revisar domínios autorizados no Firebase Authentication;
6. revisar restrições aplicáveis às chaves públicas;
7. testar login, leitura e escrita por perfil;
8. testar uma empresa isolada e consolidação;
9. somente depois alterar DNS definitivo.

Migração de hospedagem não deve ser confundida com migração de banco.

---

## 7. Processo obrigatório de release

Antes de promover para `main`:

- `node --check` em todos os módulos;
- validar contratos arquiteturais do workflow;
- smoke test em Chrome headless;
- importar módulos dinâmicos da Controladoria;
- validar regras do Firestore para coleções alteradas;
- testar conta normal e redutora;
- testar Ativo, Passivo, Receita e Despesa;
- testar Estatística Manual e Automática;
- testar uma competência fechada;
- testar vigência de conta em exercício anterior/atual/posterior;
- testar Budget e Forecast sem modificar histórico;
- testar Balanço como posição de fechamento, nunca soma de meses;
- testar Imobilizado com entrada em operação e depreciação acumulada;
- atualizar Dossiê, Manual Mestre e este guia quando houver decisão estrutural;
- conferir diff final contra `main`;
- promover preferencialmente por fast-forward;
- acompanhar QA da `main` e deploy.

---

## 8. Procedimento de recuperação

Se uma versão nova quebrar o SIG:

1. não corrigir dados no Firestore para compensar bug visual antes de entender a causa;
2. identificar último commit estável;
3. comparar código, não apenas interface;
4. verificar se o problema é cache, frontend, regra Firestore ou dado;
5. usar o checkpoint/tag estável para rollback do frontend quando necessário;
6. preservar dados criados após a versão anterior;
7. corrigir por migração compatível se o formato de dados tiver mudado.

O snapshot `archive/sig-pre-consolidacao-2026-08-31` preserva o estado anterior à consolidação de Balanço/Natureza/Segurança iniciada em 31/08/2026.

---

## 9. Texto de handoff para uma nova conversa/IA

Quando for necessário continuar em outro ambiente, usar como ponto de partida:

> Este é o SIG — Sistema Integrado de Gestão. Antes de alterar qualquer código, leia `AGENTS.md`, `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`, `docs/SIG-MANUAL-MESTRE.md`, `docs/SIG-GUIA-DE-CONTINUIDADE.md` e `SECURITY.md`. Confira a `main` atual, a branch de desenvolvimento mais recente, o roteador de Controladoria e `firestore.rules`. Não dependa de memória de conversa. Preserve Grupo/Empresa, dados existentes, vigências, contas Sintéticas/Analíticas, CCs técnicos, ciclos de Budget/Forecast e natureza contábil. Multiplicadores são de apresentação e nunca devem regravar o saldo bruto. Não publique mudança estrutural sem QA e documentação.

---

## 10. Quando este guia deve ser atualizado

Atualizar este arquivo sempre que mudar qualquer uma destas áreas:

- arquitetura de hospedagem/backend;
- branch/processo de release;
- modelo de dados relevante;
- estrutura do Plano de Contas;
- natureza/multiplicadores;
- Balanço;
- Budget/Forecast;
- Imobilizado/CAPEX;
- segurança/permissões;
- procedimento de migração ou rollback.

A entrega estrutural está incompleta se o código mudar e este material continuar descrevendo uma arquitetura antiga.
