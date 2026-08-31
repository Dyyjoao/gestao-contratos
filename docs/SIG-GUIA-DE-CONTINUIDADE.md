# SIG — Guia Operacional de Continuidade

**Finalidade:** retomar o SIG em outra conversa, IA, equipe, computador, repositório ou hospedagem sem depender de memória informal.  
**Data-base:** 31/08/2026.

---

## 1. Comece sempre daqui

Leia nesta ordem:

1. `AGENTS.md`;
2. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`;
3. `docs/SIG-MANUAL-MESTRE.md`;
4. este Guia;
5. `SECURITY.md`;
6. `app.js`;
7. `js/controllership-router.js` para descobrir módulos ativos da Controladoria;
8. `firestore.rules` / `storage.rules` quando houver dados ou permissões;
9. `.github/workflows/js-check.yml` antes de alterar arquitetura/testes.

Não assuma que o maior número `vN` é a rota vigente. Confira o roteador.

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
- Ativo/Passivo não entram na DRE/OPEX.

### Budget / Forecast

- Budget anual e versionado;
- A-1 é o exercício anterior ao selecionado;
- Forecast = Realizado fechado + futuro;
- premissas respeitam vigência mês a mês.

### Imobilizado

- CAPEX é investimento;
- depreciação começa quando o bem está disponível para uso;
- Depreciação Acumulada é redutora do Ativo;
- automação substitui manual equivalente para não duplicar.

### Telas monoempresa

- Input Mensal;
- Fluxo de Caixa;
- Prestação de Contas;
- demais cadastros/gravações quando a identidade pertence a uma empresa.

Nunca usar a primeira empresa silenciosamente em contexto múltiplo.

---

## 4. Como iniciar uma mudança

1. confirmar `main` e último commit estável;
2. conferir branches de desenvolvimento existentes;
3. comparar a branch candidata com `main`;
4. ler documentação oficial;
5. conferir rota ativa;
6. criar branch de trabalho/checkpoint quando necessário;
7. implementar com compatibilidade de dados;
8. atualizar QA e documentação junto com o código.

---

## 5. Quando mexer em dados

Antes de alterar coleção, documento ou padrão de escrita:

- ler `firestore.rules`;
- confirmar `grupoId` e `empresaId`;
- decidir identidade canônica do documento;
- considerar dados legados e duplicidades;
- não fazer migração destrutiva sem rollback;
- não transformar saldo bruto em saldo apresentado;
- não apagar histórico por causa de vigência/inativação.

---

## 6. Política de código antigo

Há versões antigas de módulos no repositório.

Procedimento:

1. confira o roteador/import atual;
2. procure referências dinâmicas;
3. confirme se migração/compatibilidade ainda depende do arquivo;
4. somente depois remova.

Arquivo antigo sem rota é dívida técnica/histórico, não autorização para reutilização.

---

## 7. QA mínimo antes de merge

Automático:

- `node --check`;
- contratos arquiteturais;
- importação de módulos dinâmicos;
- Chrome headless/smoke test;
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
- Dashboard e Prestação sem Balanço/Estatística como OPEX;
- Fluxo de Caixa bloqueado em multiempresa;
- Prestação bloqueada em multiempresa.

---

## 8. Publicação

Antes de promover para `main`:

1. todos os arquivos da entrega estão completos;
2. QA automático está verde;
3. não há referência ativa conhecida a versões antigas;
4. documentação descreve o código atual;
5. `firestore.rules` está compatível;
6. diff final contra `main` foi revisado;
7. existe rollback de frontend.

Depois do merge:

- acompanhar Quality Check da `main`;
- acompanhar deploy;
- testar login/contexto;
- testar Controladoria crítica;
- forçar atualização de cache quando necessário.

---

## 9. Hospedagem e domínio

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

## 10. Recuperação de incidente

Se uma versão quebrar:

1. não “conserte” o Firestore para compensar bug visual;
2. identifique o último commit estável;
3. compare código e Rules;
4. diferencie cache, frontend, Rule e dado;
5. faça rollback do frontend quando apropriado;
6. preserve dados criados depois da versão anterior;
7. migre dados apenas quando necessário e de forma controlada.

---

## 11. Texto curto de handoff

> Este é o SIG — Sistema Integrado de Gestão. Leia `AGENTS.md`, o Dossiê, o Manual Mestre, este Guia e `SECURITY.md` antes de alterar código. Confira `app.js`, `js/controllership-router.js`, `firestore.rules` e o Quality Check. Preserve Grupo/Empresa, dados existentes, vigências, máscara `#.##.####`, natureza contábil, CCs técnicos, ciclos de Budget/Forecast e integração de Imobilizado. Multiplicadores nunca regravam saldo bruto. Não use contexto multiempresa em tela monoempresa. Não publique mudança estrutural sem QA e documentação.

---

## 12. Quando atualizar este Guia

Atualize quando mudar:

- processo de release/rollback;
- arquitetura de hospedagem;
- fonte de verdade/documentação;
- modelo de dados importante;
- regras de contexto multiempresa;
- Plano/Natureza/Balanço;
- Budget/Forecast/Premissas;
- Imobilizado;
- segurança.