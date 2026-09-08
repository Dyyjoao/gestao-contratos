# SIG — Política de Correções Administrativas

**Baseline da política:** 08/09/2026  
**Escopo:** módulos que criam ou alteram registros persistentes com efeito operacional, financeiro, patrimonial ou de auditoria.

---

## 1. Regra permanente

**Todo módulo que cria input persistente deve possuir um caminho explícito e auditável de correção.**

A correção não pode depender de edição silenciosa ou de exclusão sem rastreabilidade. Cada módulo deve definir, conforme a natureza do registro:

- **Estorno** — caminho preferencial para registros que já produziram histórico, cálculo, saldo, indicador, obrigação, movimento ou efeito operacional;
- **Exclusão física administrativa** — exceção destinada a duplicidade, teste, cadastro indevido ou erro sem necessidade de manter o documento original;
- **Inativação / baixa / cancelamento operacional** — ciclo de vida do cadastro quando apagar o registro quebraria vínculos ou histórico.

O desenho deve preservar integridade entre módulos. Um cadastro com dependências não deve ser fisicamente apagado apenas porque o usuário é Administrador.

---

## 2. Reautenticação administrativa

Ações destrutivas ou de estorno cobertas por esta política usam o helper central:

- `js/admin-actions.js`.

Fluxo:

1. verificar se o perfil atualmente logado é **Administrador**;
2. exigir justificativa quando a ação for correção/estorno/exclusão;
3. solicitar a senha **do usuário Firebase atualmente logado**;
4. executar `reauthenticateWithCredential` com `EmailAuthProvider`;
5. somente após a reautenticação executar a gravação;
6. registrar o evento na trilha administrativa quando a ação usar o helper central.

A senha:

- não é salva no Firestore;
- não é registrada em log ou auditoria;
- não é enviada para outra conta;
- serve exclusivamente para reautenticar a sessão Firebase atual.

### Limite técnico importante

As **Firestore Rules não comprovam que a senha foi digitada novamente segundos antes da operação**. As Rules validam o papel Administrador, grupo/empresa e o poder de gravar/apagar. A reautenticação recente é uma camada adicional implementada no frontend com Firebase Authentication.

Nunca documentar ou comunicar que a Rule, sozinha, “confirma a senha administrativa”.

---

## 3. Auditoria administrativa

Coleção:

- `auditoriaAdministrativa`.

Eventos gerados pelo helper central preservam, conforme aplicável:

- `grupoId`;
- `empresaId`;
- usuário/UID;
- nome do usuário;
- módulo;
- ação;
- coleção de origem;
- ID do documento afetado;
- motivo obrigatório;
- resumo;
- snapshot anterior serializado;
- data/hora do evento.

A auditoria é **append-only**:

- Administrador e Governança/Auditoria podem consultar conforme Rules;
- criação é exclusiva do Administrador autenticado;
- update/delete são bloqueados.

Quando a operação permite batch, alteração/exclusão e criação do log devem ocorrer na mesma operação atômica.

---

## 4. Estorno

Estorno é a correção padrão quando o registro já participa de histórico ou cálculo.

Contrato recomendado:

- motivo obrigatório;
- usuário que estornou;
- nome do usuário;
- timestamp;
- registro original continua consultável;
- valor deixa de compor cálculo/indicador quando esse for o significado do estorno;
- interface identifica visualmente o registro estornado;
- o registro estornado não volta a ser editado como se fosse normal, salvo fluxo explícito de reversão aprovado no desenho do módulo.

Campos usuais:

- `estornado: true`;
- `motivoEstorno`;
- `estornadoPor`;
- `estornadoPorNome`;
- `estornadoEm`.

O status operacional pode também ser alterado para `cancelado`/`cancelada` quando o módulo usa esse estado para retirar o valor dos cálculos, mas o flag `estornado` diferencia **correção administrativa** de um cancelamento normal de negócio.

---

## 5. Exclusão física

Exclusão física é excepcional.

Requisitos mínimos:

- perfil Administrador;
- reautenticação da conta atual;
- justificativa obrigatória;
- Rule permitindo delete somente ao Administrador;
- auditoria administrativa preservada quando o módulo usa o helper central;
- verificação prévia de dependências.

Não apagar fisicamente um registro com referência que cause órfão, quebra contábil, perda de rastreabilidade ou inconsistência de saldo. Nesses casos usar estorno, inativação ou baixa.

---

## 6. Estado dos módulos

Esta política passa a ser obrigatória para módulos novos. Os módulos legados devem ser migrados de forma controlada; a existência desta política **não significa que toda tela antiga já foi convertida**.

| Módulo / entrada | Situação da correção administrativa |
| --- | --- |
| Permutas / movimentos | Contrato próprio consolidado: estorno auditável e delete físico Admin + reautenticação |
| Fluxo de Caixa / lançamentos | Centralizado nesta baseline: estorno + exclusão Admin, motivo e `auditoriaAdministrativa` |
| Frota / manutenção | Centralizado nesta baseline: estorno + exclusão Admin |
| Frota / IPVA, multas e obrigações | Centralizado nesta baseline: estorno + exclusão Admin |
| Frota / veículo | Delete Admin somente para cadastro sem Imobilizado, manutenção ou obrigação; com vínculos usar baixa/inativação |
| Vendas | Cancelamento preserva histórico; migração ao helper central deve ser tratada em evolução específica antes de liberar delete físico |
| Realizado / Budget / Forecast / Premissas e outros inputs legados | Devem ser auditados individualmente antes de alterar regra de histórico ou exclusão |

A migração de módulos legados deve respeitar suas regras contábeis e funcionais; não aplicar delete genérico em massa.

---

## 7. Fluxo de Caixa

Coleção principal de lançamentos:

- `fluxoCaixaLancamentos`.

Nesta baseline:

- usuário operacional continua criando/editando lançamentos conforme `caixaLancar`;
- o status `cancelado` deixa de ser caminho comum de correção no formulário;
- estorno exige Administrador + senha atual + motivo;
- estorno mantém o documento com `status: cancelado` e metadados de estorno;
- cálculos de Caixa já ignoram `status == cancelado`;
- exclusão física exige Administrador + senha + motivo e gera auditoria;
- Rules impedem usuário comum de transformar lançamento em `cancelado` por API e bloqueiam delete não administrativo.

---

## 8. Gestão de Frota

A política se aplica a entradas históricas da Frota:

- `manutencoesFrota`;
- IPVA/licenciamento/multas/obrigações vinculadas ao veículo;
- cadastro mestre de veículo quando elegível a exclusão administrativa.

Veículo com vínculo em `imobilizados`, manutenção ou obrigação **não deve ser fisicamente excluído**. O ciclo correto é baixa/inativação e correção dos registros dependentes.

---

## 9. Checklist para qualquer módulo novo

Antes de liberar uma tela que grava dados:

1. identificar se o registro é mestre, transacional ou histórico;
2. definir estorno, exclusão, inativação ou combinação;
3. definir efeito do estorno nos cálculos;
4. implementar guardas de UI;
5. revisar Firestore Rules;
6. registrar trilha administrativa quando aplicável;
7. verificar dependências antes de delete físico;
8. adicionar QA automatizado;
9. atualizar README, Dossiê/Manual e documentação específica;
10. publicar a Rule correspondente ao mesmo SHA do frontend.

---

## 10. Fonte técnica de verdade

Arquivos centrais:

- `js/admin-actions.js` — reautenticação e auditoria compartilhadas;
- `js/cashflow-admin-actions.js` — adaptação do Fluxo de Caixa;
- `js/fleet-admin-actions.js` — adaptação da Frota;
- `js/permutas.js` — contrato próprio já existente;
- `firestore.rules` — barreira de dados;
- `.github/workflows/admin-correction-contract-check.yml` — contrato automatizado.
