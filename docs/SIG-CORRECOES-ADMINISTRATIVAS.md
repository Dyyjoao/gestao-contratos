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

A existência de edição operacional comum não substitui o caminho de correção administrativa. Edição, cancelamento comercial, baixa patrimonial e encerramento de ciclo continuam sendo ações normais do negócio; o flag de estorno identifica uma **correção administrativa excepcional**.

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

Quando a correção afeta vários documentos relacionados, deve ser utilizado `executarCorrecoesComAuditoria`: todos os updates/deletes e a criação do log ocorrem no mesmo `writeBatch`, evitando correção parcial.

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
- interface identifica o registro estornado quando a tela mantém histórico detalhado;
- o registro estornado não volta a ser editado como se fosse normal, salvo fluxo explícito de reversão aprovado no desenho do módulo.

Campos usuais:

- `estornado: true`;
- `motivoEstorno`;
- `estornadoPor`;
- `estornadoPorNome`;
- `estornadoEm`.

O status operacional pode também ser alterado para `cancelado`/`cancelada` ou `inativo` quando o módulo usa esse estado para retirar o valor/cadastro dos cálculos, mas o flag `estornado` diferencia **correção administrativa** de um cancelamento ou inativação normal de negócio.

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

Na baseline de 08/09/2026, as Rules antigas de delete físico de **Empresas, Contratos, Prestadores, Almoxarifado e Plano de Contas** também foram endurecidas para `administrador()`. Assim, um perfil operacional com permissão histórica de “excluir” não consegue mais apagar diretamente esses documentos via API.

---

## 6. Estado dos módulos ativos

| Módulo / entrada | Correção administrativa vigente |
| --- | --- |
| Permutas / movimentos | Estorno auditável; delete físico Admin + reautenticação conforme contrato próprio |
| Fluxo de Caixa / lançamentos | Estorno + exclusão física Admin; ambos com senha, motivo e `auditoriaAdministrativa` |
| Fluxo de Caixa / contas bancárias | Estorno administrativo inativa a conta; lançamentos históricos permanecem |
| Fluxo de Caixa / compromissos fixos | Estorno administrativo inativa o compromisso; provisões já geradas são tratadas individualmente |
| Frota / manutenção | Estorno + exclusão Admin |
| Frota / IPVA, multas e obrigações | Estorno + exclusão Admin |
| Frota / veículo | Delete Admin somente para cadastro elegível; com vínculos usar baixa/inativação |
| Vendas | Estorno Admin transforma a venda em `cancelada` com flag de estorno; cancelamento comercial normal continua separado; delete físico permanece bloqueado |
| Vendedores | Estorno Admin = inativação auditada; vendas históricas e snapshots de comissão permanecem |
| Consórcios | Estorno Admin = `cancelado` com histórico preservado; delete físico bloqueado |
| Inadimplência / títulos | Estorno Admin = `cancelado`; carteira deixa de considerar o saldo; delete físico bloqueado |
| Imobilizado & CAPEX | Estorno Admin = `cancelado` e desligamento das integrações automáticas; baixa real do bem continua usando `baixado` |
| Premissas | Estorno Admin = inativação auditada; histórico de vigência é preservado |
| Input Mensal | Estorno Admin por **Empresa × competência × Centro/bloco** zera somente o mês selecionado, preserva os demais meses e registra snapshot anterior |
| Budget / Forecast | Estorno Admin de sublinha persistida inativa `planejamentoDetalhes` e recalcula a linha agregada no mesmo batch |
| Centros de Custo | Estorno Admin = inativação auditada; vínculos e histórico permanecem |
| Plano de Contas | Inativação é o caminho normal com histórico; exclusão física de conta/ramo sem referências exige Admin + senha + motivo + auditoria |
| Contratos | Exclusão física é interceptada pelo contrato administrativo e exige Admin + senha + motivo + auditoria |

Módulos antigos que permanecem fisicamente no repositório, mas não fazem parte do escopo ativo da navegação, não devem ser usados como precedente arquitetural. Suas Rules de delete físico foram endurecidas quando necessário para impedir bypass por API.

---

## 7. Fluxo de Caixa

Coleção principal de lançamentos:

- `fluxoCaixaLancamentos`.

Nesta baseline:

- usuário operacional continua criando/editando lançamentos conforme `caixaLancar`;
- o status `cancelado` deixa de ser caminho comum de correção no formulário;
- estorno exige Administrador + senha atual + motivo;
- estorno mantém o documento com `status: cancelado` e metadados de estorno;
- cálculos de Caixa ignoram `status == cancelado`;
- exclusão física exige Administrador + senha + motivo e gera auditoria;
- Rules impedem usuário comum de transformar lançamento em `cancelado` por API e bloqueiam delete não administrativo;
- conta bancária e compromisso fixo usam **inativação auditada**, evitando apagar vínculos de lançamentos/provisões.

---

## 8. Realizado, Budget e Forecast

### Input Mensal

Um documento de `realizadoMensal` contém vários meses. Por isso, o estorno não apaga o documento inteiro.

A ação administrativa:

1. identifica Empresa, exercício, competência mensal e Centro/bloco selecionados;
2. localiza os documentos persistidos com valor diferente de zero naquele mês;
3. zera **somente a competência selecionada**;
4. preserva os demais meses;
5. registra metadados da última correção nos documentos;
6. grava em `auditoriaAdministrativa` o snapshot dos valores anteriores;
7. executa tudo em um único batch.

### Budget / Forecast

Sublinhas persistidas vivem em `planejamentoDetalhes`, enquanto `budgetLinhas`/`forecastLinhas` armazenam o agregado Conta × Centro × versão.

O estorno administrativo de uma sublinha:

- inativa o detalhe original;
- preserva a sublinha para histórico;
- recalcula os 12 meses a partir dos detalhes ativos restantes;
- atualiza a linha agregada correspondente;
- grava a auditoria;
- executa detalhe + agregado + auditoria de forma atômica.

Sublinhas ainda não salvas podem ser removidas do rascunho sem estorno, porque ainda não existem como registro persistente.

---

## 9. Gestão de Frota

A política se aplica a entradas históricas da Frota:

- `manutencoesFrota`;
- IPVA/licenciamento/multas/obrigações vinculadas ao veículo;
- cadastro mestre de veículo quando elegível a exclusão administrativa.

Veículo com vínculo em `imobilizados`, manutenção ou obrigação **não deve ser fisicamente excluído**. O ciclo correto é baixa/inativação e correção dos registros dependentes.

---

## 10. Plano de Contas e cadastros mestres

Plano de Contas exige tratamento especial:

- conta com histórico ou referência deve ser inativada;
- conta/ramo de teste ou erro pode ser excluído somente se a varredura de referências estiver limpa;
- a varredura considera Realizado, Budget, Forecast, detalhes de planejamento, premissas, Imobilizado/CAPEX, Centros de Custo, classificações/planejamento legado e vínculos patrimoniais conhecidos;
- falha na leitura de qualquer base necessária bloqueia a exclusão (**fail-closed**);
- delete físico no Firestore é exclusivo do Administrador.

Cadastros mestres como Centro de Custo, vendedor, conta bancária e compromisso fixo preferem **inativação auditada** em vez de delete físico.

---

## 11. Checklist para qualquer módulo novo

Antes de liberar uma tela que grava dados:

1. identificar se o registro é mestre, transacional ou histórico;
2. definir estorno, exclusão, inativação ou combinação;
3. definir efeito do estorno nos cálculos;
4. implementar guardas de UI;
5. revisar Firestore Rules;
6. registrar trilha administrativa quando aplicável;
7. verificar dependências antes de delete físico;
8. usar batch atômico quando a correção afetar registros relacionados;
9. adicionar QA automatizado;
10. atualizar README, Dossiê/Manual e documentação específica;
11. publicar a Rule correspondente ao mesmo SHA do frontend.

---

## 12. Fonte técnica de verdade

Arquivos centrais:

- `js/admin-actions.js` — reautenticação, auditoria e correções atômicas compartilhadas;
- `js/cashflow-admin-actions.js` — lançamentos do Fluxo de Caixa;
- `js/fleet-admin-actions.js` — Frota;
- `js/input-admin-actions.js` — Vendas, Consórcios, Inadimplência, Premissas, Imobilizado, Input Mensal e Budget/Forecast;
- `js/master-admin-actions.js` — cadastros mestres e exclusões físicas protegidas de Contratos/Plano de Contas;
- `js/permutas.js` — contrato próprio já existente;
- `firestore.rules` — barreira de dados;
- `.github/workflows/admin-correction-contract-check.yml` — contrato automatizado.
