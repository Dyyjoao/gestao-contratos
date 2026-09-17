# SIG — Correções Administrativas

**Baseline:** 16/09/2026

## 1. Regra permanente

Todo módulo que persiste input deve possuir caminho de correção auditável.

### Estorno — caminho normal
- perfil Administrador;
- reautenticação com a senha do Administrador atualmente logado;
- motivo obrigatório;
- registro de usuário, data/hora e justificativa;
- preservação do documento/histórico;
- neutralização do impacto ativo;
- auditoria em `auditoriaAdministrativa`.

### Exclusão física — exceção
- somente Administrador;
- reautenticação;
- aviso explícito;
- motivo obrigatório;
- auditoria antes da remoção;
- somente duplicidade, teste ou cadastro comprovadamente seguro;
- não usar quando houver dependências, histórico ou impacto gerencial/contábil.

## 2. Invariante de backend

`auditoriaAdministrativa` é append-only. Senhas nunca são persistidas. A reautenticação ocorre via Firebase Authentication.

Helpers centrais:
- `confirmarAcaoAdministrativa(...)`;
- `auditoriaBase(...)`;
- `atualizarComAuditoria(...)`;
- `excluirComAuditoria(...)`;
- `executarCorrecoesComAuditoria(...)`.

Adapters existentes:
- `js/input-admin-actions.js`;
- `js/master-admin-actions.js`;
- `js/workflow-admin-actions.js`;
- `js/fleet-admin-actions.js`;
- `js/cashflow-admin-actions.js`.

## 3. Aplicação por módulos

A política vale para módulos atuais e futuros, incluindo:
- Plano de Contas;
- Fluxo de Caixa;
- Frota;
- Permutas;
- Contratos;
- Contas a Pagar quando a correção administrativa for necessária;
- módulos operacionais migrados do Script, como Produção e Descarte.

Produção em homologação já deve seguir o padrão de estorno administrativo, mas não é funcionalidade produtiva até Rules/merge.

## 4. Estados protegidos

Sincronizadores automáticos nunca devem apagar ou sobrescrever estados históricos protegidos apenas para recalcular projeções.

Exemplos:
- Contas a Pagar: `pago` e `estornado` preservados;
- contratos/reajustes: recalcular futuro/aberto, preservar realizado/fechado/pago;
- permutas: movimento estornado permanece visível e sai dos totais;
- vendas: cancelamento/estorno preserva histórico;
- produção: estorno deve retirar o lançamento dos KPIs sem apagar sua existência.

## 5. Plano de Contas legado

Conta com referência histórica não deve ser excluída silenciosamente. Se uma conta legada estiver bloqueada por referências invisíveis/orfãs, o fluxo correto é diagnóstico auditável e correção das referências, não remoção forçada.

Esse ponto continua pendente de tratamento específico.

## 6. Firestore Rules

UI sozinha não basta. Quando um módulo permitir delete/update administrativo, a Rule deve manter a barreira coerente com a política aprovada.

Toda mudança de `firestore.rules` exige publicação separada no Firebase e confirmação explícita.

## 7. Nova tela com input

Checklist obrigatório:
1. ação normal de correção definida;
2. estorno/inativação preserva histórico;
3. exclusão física, se existir, é excepcional;
4. reautenticação ADM;
5. motivo obrigatório;
6. auditoria;
7. Rules coerentes;
8. QA cobrindo autorização e histórico.