# SIG — Guia Operacional de Continuidade

**Finalidade:** retomar o SIG em outra conversa, IA, equipe, computador, repositório ou hospedagem sem depender de memória informal.  
**Data-base:** 01/09/2026.

---

## 1. Comece sempre daqui

Leia nesta ordem:

1. `AGENTS.md`;
2. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`;
3. `docs/SIG-MANUAL-MESTRE.md`;
4. este Guia;
5. `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`;
6. `SECURITY.md`;
7. `app.js`;
8. `js/controllership-router.js` para descobrir módulos ativos da Controladoria;
9. `firestore.rules`, `storage.rules`, `firebase.json` e `.firebaserc` quando houver dados, permissões ou deploy de backend;
10. `.github/workflows/js-check.yml` e demais workflows de contrato antes de alterar arquitetura/testes.

Não assuma que o maior número `vN` é a rota vigente. Confira o roteador.

**Regra de release:** GitHub Pages publica o frontend. Ele não publica Rules do Firebase. Uma mudança que exige nova Rule só está completamente em produção depois do deploy separado no Firebase.

---

## 2. Estado de recuperação preservado

Antes da consolidação de 31/08/2026, o estado cumulativo foi preservado em:

```text
archive/sig-pre-consolidacao-2026-08-31
```

Esse snapshot é ponto de recuperação histórico. Não desenvolver diretamente nele e não reescrever seu histórico.

O desenvolvimento normal deve partir da `main` atual ou de branch explicitamente criada a partir dela.

---

## 3. Invariantes que precisam ser lembradas em qualquer retomada

### Plano de Contas

```text
1 Ativo
2 Passivo
3 Receita
4 Despesa
9 Estatística

#.##       Sintética
#.##.####  Analítica
```

Sintética nunca recebe lançamento. Analítica é folha lançável.

### Natureza

- Ativo: Devedora;
- Passivo: Credora;
- Receita: Credora;
- Despesa: Devedora;
- Estatística: Neutra.

Conta redutora usa natureza oposta à raiz.

**Multiplicadores são de apresentação/cálculo e nunca regravam o saldo bruto.**

### Centros técnicos

```text
__cc_estatistico__
__cc_balanco__
```

Eles não são Centros operacionais.

### Balanço

- posição de fechamento;
- meses não são somados;
- consolidação multiempresa por código;
- Ativo/Passivo não entram na DRE/OPEX;
- contas patrimoniais mapeadas ao Imobilizado são substituídas pela posição automática do bem;
- se a coleção `imobilizados` estiver indisponível, o cálculo automático deve ser bloqueado, nunca presumido como zero.

### Budget / Forecast

- Budget anual e versionado;
- A-1 é o exercício anterior ao selecionado;
- Forecast = Realizado fechado + futuro;
- premissas respeitam vigência mês a mês;
- depreciação automática do Imobilizado substitui a projeção manual da mesma Conta × CC;
- erro ao carregar `imobilizados` bloqueia a projeção automática.

### Imobilizado

- CAPEX é investimento;
- depreciação começa quando o bem está disponível para uso;
- Depreciação Acumulada é redutora do Ativo;
- automação substitui manual equivalente para não duplicar;
- fim da vida útil encerra a depreciação, mas não baixa automaticamente o bem;
- bem totalmente depreciado continua no patrimônio até baixa efetiva;
- a coleção persistente é `imobilizados`;
- leitura dessa coleção é dependência crítica para Balanço, Input, Budget, Forecast, DRE projetada e validação de inativação de contas.

### Telas monoempresa

- Input Mensal;
- Fluxo de Caixa;
- Prestação de Contas;
- Imobilizado & CAPEX;
- Budget/Forecast para lançamento;
- demais cadastros/gravações quando a identidade pertence a uma empresa.

Nunca usar a primeira empresa silenciosamente em contexto múltiplo.

---

## 4. Estado funcional consolidado em 01/09/2026

A versão consolidada inclui:

- Plano de Contas v5 com máscara fixa, natureza e multiplicadores centrais;
- Balanço Patrimonial;
- Input Mensal com bloco patrimonial;
- Imobilizado & CAPEX;
- depreciação automática integrada ao Balanço, Budget, Forecast e DRE;
- Budget e Forecast com abertura de tela validada por browser test;
- premissas com vigência por competência;
- DRE multiempresa consolidada por código e com última versão por empresa;
- núcleo financeiro compartilhado para Dashboard e Prestação;
- Fluxo de Caixa e Prestação protegidos como monoempresa;
- documentação de segurança e continuidade;
- contrato explícito de deploy Firebase via `firebase.json` e `.firebaserc`;
- proteção fail-closed para dependências automáticas de `imobilizados`.

A coleção nova de backend desta consolidação é `imobilizados`. As demais evoluções usam coleções já existentes.

---

## 5. Como iniciar uma mudança

1. confirmar `main` e último commit estável;
2. conferir branches de desenvolvimento existentes;
3. comparar a branch candidata com `main`;
4. ler documentação oficial;
5. conferir rota ativa;
6. identificar se a mudança toca somente frontend ou também Firestore/Storage;
7. criar branch de trabalho/checkpoint quando necessário;
8. implementar com compatibilidade de dados;
9. atualizar QA, Rules e documentação junto com o código.

---

## 6. Quando mexer em dados

Antes de alterar coleção, documento ou padrão de escrita:

- ler `firestore.rules`;
- confirmar `grupoId` e `empresaId`;
- decidir identidade canônica do documento;
- considerar dados legados e duplicidades;
- não fazer migração destrutiva sem rollback;
- não transformar saldo bruto em saldo apresentado;
- não apagar histórico por causa de vigência/inativação;
- criar Rule no mesmo pacote se houver coleção/subcoleção nova;
- atualizar `docs/SIG-FIREBASE-DEPLOY-E-RULES.md` quando o contrato de backend mudar.

**Coleção crítica não pode usar falha de leitura como sinônimo de coleção vazia.** Se o dado alimenta cálculo contábil, projeção ou trava de integridade, prefira falhar de forma fechada.

---

## 7. Política de código antigo

Há versões antigas de módulos no repositório.

Procedimento:

1. confira o roteador/import atual;
2. procure referências dinâmicas;
3. confirme se migração/compatibilidade ainda depende do arquivo;
4. somente depois remova.

Arquivo antigo sem rota é dívida técnica/histórico, não autorização para reutilização.

---

## 8. QA mínimo antes de merge

Automático:

- `node --check`;
- contratos arquiteturais;
- importação de módulos dinâmicos;
- abertura real das telas críticas no Chrome headless;
- contrato Firebase (`firebase.json`, `.firebaserc`, Rules e dependências críticas);
- Rules quando aplicável.

Funcional/contábil:

- Ativo normal e redutor;
- Passivo normal e redutor;
- Receita e Despesa;
- Estatística neutra;
- saldo bruto preservado;
- Balanço fechado e posição mensal;
- consolidação por código;
- vigência de contas;
- vigência de premissas Jan–Jun / Jul–Dez;
- Budget A-1;
- Forecast fechado + futuro;
- Imobilizado/depreciação automática;
- falha simulada de `imobilizados` bloqueando cálculo automático;
- conta vinculada a Imobilizado não podendo ser inativada sem validação da coleção;
- Dashboard e Prestação sem Balanço/Estatística como OPEX;
- Fluxo de Caixa bloqueado em multiempresa;
- Prestação bloqueada em multiempresa.

---

## 9. Publicação

Antes de promover para `main`:

1. todos os arquivos da entrega estão completos;
2. QA automático está verde;
3. não há referência ativa conhecida a versões antigas;
4. documentação descreve o código atual;
5. `firestore.rules` e `storage.rules` estão compatíveis;
6. `firebase.json` e `.firebaserc` apontam para o contrato correto;
7. diff final contra `main` foi revisado;
8. existe rollback de frontend;
9. se Rules mudaram, existe procedimento autorizado para publicá-las.

Depois do merge:

- acompanhar Quality Check da `main`;
- acompanhar GitHub Pages;
- se Rules mudaram, executar o deploy Firebase separado;
- testar login/contexto;
- testar a coleção nova/alterada com usuário real;
- testar Controladoria crítica;
- forçar atualização de cache quando necessário.

**Não declarar release concluída apenas porque o Pages ficou verde quando houver mudança de Rules.**

---

## 10. Hospedagem e domínio

Frontend e Firestore são independentes.

Para trocar host/domínio sem perder dados:

1. preservar release estável;
2. manter o mesmo Firebase inicialmente;
3. configurar novo host e HTTPS;
4. adicionar/revisar domínio autorizado no Firebase Authentication;
5. testar perfis/Rules;
6. testar empresa única e consolidação;
7. alterar DNS somente após aceite.

Nunca colocar segredo de backend/IA no JavaScript cliente.

---

## 11. Recuperação de incidente

Se uma versão quebrar:

1. não “conserte” o Firestore para compensar bug visual;
2. identifique o último commit estável;
3. compare código e Rules;
4. diferencie cache, frontend, Rule e dado;
5. confirme se a Rule do Git é a mesma efetivamente publicada no Firebase;
6. faça rollback do frontend quando apropriado;
7. preserve dados criados depois da versão anterior;
8. migre dados apenas quando necessário e de forma controlada.

Se a tela abre mas uma base automática falha, não aceite valores derivados como confiáveis até restabelecer a coleção crítica.

---

## 12. Texto curto de handoff

> Este é o SIG — Sistema Integrado de Gestão. Leia `AGENTS.md`, o Dossiê, o Manual Mestre, este Guia, `SIG-FIREBASE-DEPLOY-E-RULES.md` e `SECURITY.md` antes de alterar código. Confira `app.js`, `js/controllership-router.js`, `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc` e os workflows de QA. Preserve Grupo/Empresa, dados existentes, vigências, máscara `#.##.####`, natureza contábil, CCs técnicos, ciclos de Budget/Forecast e integração de Imobilizado. Multiplicadores nunca regravam saldo bruto. Dependência contábil crítica deve falhar de forma fechada. Não use contexto multiempresa em tela monoempresa. GitHub Pages não publica Rules Firebase. Não publique mudança estrutural sem QA, Rules compatíveis e documentação.

---

## 13. Quando atualizar este Guia

Atualize quando mudar:

- processo de release/rollback;
- arquitetura de hospedagem;
- projeto Firebase ou contrato de Rules;
- fonte de verdade/documentação;
- modelo de dados importante;
- regras de contexto multiempresa;
- Plano/Natureza/Balanço;
- Budget/Forecast/Premissas;
- Imobilizado;
- segurança.
