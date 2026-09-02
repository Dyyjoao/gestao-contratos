# SIG — Governança Antifraude, Segurança de TI e Inadimplência

Data-base: 02/09/2026

## 1. Objetivo

Esta evolução adiciona dois controles gerenciais simples ao SIG:

1. **Cockpit Antifraude & Segurança de TI**, dentro de Governança & Compliance.
2. **Inadimplência & Aging**, como página própria da Controladoria.

A proposta é reduzir exposição a fraudes e dar visibilidade mensal a riscos operacionais sem transformar o SIG em um SIEM, antivírus, ERP de cobrança ou plataforma GRC complexa.

---

## 2. Referências externas usadas no desenho

### NIST Cybersecurity Framework 2.0

O CSF 2.0 elevou **Govern** a uma função própria e organiza segurança em Govern, Identify, Protect, Detect, Respond e Recover. Para o SIG, isso foi traduzido em responsáveis, controles, revisões, ocorrências, auditoria, achados e planos de ação.

Referências:
- https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20
- https://www.nist.gov/cyberframework/faqs

### CISA — pequenas e médias empresas

A CISA recomenda como fundamentos para pequenas e médias empresas: prevenção a phishing, senhas fortes, MFA, atualização de software, logging, backups e proteção de dados. O baseline do SIG cobre esses pontos sem tentar substituir as ferramentas técnicas.

Referência:
- https://www.cisa.gov/small-and-medium-sized-business-resources

### FBI / IC3 — Business Email Compromise

O BEC é um golpe voltado a fluxos legítimos de transferência de recursos e pode envolver comprometimento de e-mail ou engenharia social. O IC3 informou US$ 55,49 bilhões em perdas expostas globais reportadas entre outubro/2013 e dezembro/2023. O caso reforça a necessidade de validação independente de alteração de dados bancários e resposta imediata junto à instituição financeira.

Referência:
- https://www.ic3.gov/PSA/2024/PSA240911

### Banco Central — boleto falso e resposta a golpes

O Banco Central orienta verificar beneficiário e banco destinatário antes do pagamento e procurar o prestador por canais oficiais quando houver divergência. Se o golpe já ocorreu, a orientação é acionar o banco e preservar/registrar o ocorrido.

Referências:
- https://www.bcb.gov.br/meubc/faqs/p/vitima-pagou-um-boleto-e-caiu-em-um-golpe
- https://www.bcb.gov.br/meubc/faqs/p/dicas-gerais-de-como-proceder-apos-sofrer-um-golpe

### NIST SP 800-63B — senhas

O SIG não trata troca periódica de senha como proteção principal. A recomendação atual do NIST é **não exigir troca arbitrária periódica** e obrigar troca quando houver evidência de comprometimento. O cockpit deixa esta opção como padrão, mas permite 90/180/365 dias caso exista política corporativa específica.

Referência:
- https://pages.nist.gov/800-63-4/sp800-63b.html

---

## 3. Cockpit Antifraude & TI

Arquivo: `js/governance-security.js`

O módulo é uma extensão da página existente `js/governance.js`. Ele não cria um segundo sistema de auditoria: reutiliza as estruturas já consolidadas de Governança.

### 3.1 KPIs

- percentual de controles em dia;
- quantidade de controles vencidos;
- ocorrências/tentativas de fraude nos últimos 90 dias;
- situação e conformidade da auditoria mensal;
- quantidade de planos de ação abertos originados nas auditorias de segurança.

### 3.2 Protocolo financeiro mínimo

Antes de pagar:

1. alteração de dados bancários não pode ser validada somente pelo e-mail que solicitou a mudança;
2. confirmar por canal oficial previamente conhecido;
3. usar segunda aprovação quando houver mudança de conta/beneficiário;
4. conferir beneficiário, CNPJ/CPF e banco de destino no boleto/Pix;
5. em suspeita, interromper pagamento, preservar evidências e acionar o banco.

### 3.3 Baseline de controles

O botão **Implantar controles recomendados** cria, sem duplicar controles já existentes:

- validação independente de alteração bancária de fornecedor;
- conferência de beneficiário/CNPJ/banco de boleto ou Pix;
- MFA em e-mail, banco, Drive e acessos remotos;
- antivírus/EDR ativo e atualizado;
- atualizações de Windows, navegadores e softwares críticos;
- bloqueio automático de tela, com meta operacional de até 10 minutos;
- backup + teste de restauração;
- revisão de administradores e acessos de ex-colaboradores;
- treinamento/alerta periódico de phishing e fraude financeira;
- revisão de credenciais, sessões e evidências de comprometimento.

### 3.4 Política de senha

Padrão: **por evento/comprometimento**.

Opções adicionais para políticas internas:
- 90 dias;
- 180 dias;
- 365 dias.

Mesmo quando uma rotação periódica for escolhida, MFA, controle de sessão, treinamento e revisão de acessos permanecem controles obrigatórios do baseline.

### 3.5 Ocorrências

Tipos iniciais:
- boleto/Pix falso;
- BEC/e-mail comprometido;
- alteração fraudulenta de fornecedor;
- phishing/roubo de credencial;
- malware/acesso indevido;
- outro.

Campos de acompanhamento:
- data;
- canal;
- valor exposto;
- perda efetiva;
- status;
- resumo;
- resposta/evidências.

As ocorrências são registradas na estrutura existente `complianceRiscos`, identificadas por `tipoRegistro = ocorrencia_antifraude` e `categoria = seguranca_antifraude`.

---

## 4. Auditoria mensal de TI & Antifraude

O baseline cria o programa permanente:

**Auditoria Mensal · Antifraude & Segurança TI**

Checklist inicial:

1. alteração cadastral e bancária de fornecedores;
2. conferência de boleto/Pix;
3. MFA em contas críticas;
4. antivírus/EDR;
5. patches e atualizações;
6. bloqueio automático de tela;
7. backup e teste de restauração;
8. privilégios administrativos;
9. regras/encaminhamentos suspeitos de e-mail;
10. resposta a credenciais comprometidas;
11. treinamento antifraude;
12. plano e contatos de resposta a incidente.

O ciclo mensal recebe uma cópia do checklist vigente. A execução, evidências, achados, conclusão e plano de ação continuam sendo geridos pelo motor existente em `js/governance.js`.

Achados podem gerar `planosAcao`, preservando a integração com Minha Mesa.

---

## 5. Permissões — Governança

Novidade em `js/profiles.js`:

- `governanca.antifraude` — Visualizar Cockpit Antifraude & TI.

Permissões já existentes permanecem responsáveis pelas ações:

- `governanca.configurar` — implantar/editar controles, política de credenciais e registrar ocorrências;
- `governanca.auditar` — criar/executar ciclos;
- `governanca.evidencias` — evidências;
- `governanca.planoAcao` — planos de ação;
- `governanca.validar` — validação/encerramento.

Administrador mantém acesso total.

---

## 6. Inadimplência & Aging

Arquivo: `js/ctrl-delinquency-v1.js`

Local: submenu **Controladoria & FP&A → Inadimplência & Aging**.

### 6.1 KPIs

- carteira em aberto;
- valor vencido;
- índice de inadimplência = valor vencido / carteira em aberto;
- saldo acima de 90 dias.

### 6.2 Aging

Faixas:

- a vencer;
- 1–30 dias;
- 31–60 dias;
- 61–90 dias;
- acima de 90 dias.

A referência é a data atual para o mês corrente/futuro e o último dia do mês para competências anteriores.

### 6.3 Títulos

Campos:
- empresa;
- competência;
- cliente;
- documento/fatura;
- vencimento;
- valor original;
- valor recebido;
- saldo;
- status;
- data do recebimento;
- observação/negociação.

Status:
- em aberto;
- negociado;
- recebido;
- cancelado.

Não há exclusão física. Recebimento e cancelamento permanecem no histórico.

### 6.4 Permissões

Novidades:

- `controladoria.inadimplencia` — Visualizar Inadimplência & Aging;
- `controladoria.inadimplenciaEditar` — Gerir carteira de inadimplência.

`controladoria.editar` e Administrador continuam com administração total.

O submenu é ocultado para quem não possui a permissão e a própria ação revalida o acesso ao abrir a página.

---

## 7. Firebase

### 7.1 Antifraude

O cockpit reutiliza `configuracoesControladoria` e os campos já autorizados:

- `complianceObrigacoes`;
- `complianceRiscos`;
- `complianceProgramasAuditoria`;
- `complianceCiclosAuditoria`.

A função `governancaVisualizar()` nas Rules passa a reconhecer também `governanca.antifraude`.

### 7.2 Inadimplência

Nova coleção:

`inadimplenciaTitulos`

Cada documento recebe `grupoId` e `empresaId` pelos helpers centrais do SIG.

Rules:
- leitura: `inadimplenciaVisualizar()` + `documentoAcessivel`;
- criação: `inadimplenciaEditar()` + `documentoAcessivel`;
- atualização: mesma permissão, preservando `grupoId` e `empresaId`;
- exclusão física: proibida.

A coleção própria evita concentrar uma carteira potencialmente grande dentro do documento de configurações e reduz risco de limite/troca concorrente de arrays.

**Importante:** GitHub Pages publica o frontend, mas não publica Firestore Rules. Uma release que inclua esta mudança só estará funcional para Inadimplência depois da publicação das Rules atuais no Firebase do projeto `gestao-de-contratos-b266b`.

---

## 8. QA obrigatório

### Governança / Antifraude

- perfil sem `governanca.antifraude`: tab não aparece;
- perfil somente consulta: tab abre, mas controles de configuração não aparecem;
- configurar: baseline cria controles uma única vez;
- criar auditoria do mês duas vezes: segunda tentativa deve ser bloqueada;
- ocorrência registrada deve aparecer no cockpit e na base de riscos;
- achado de auditoria deve poder gerar plano de ação;
- troca de empresa deve recarregar o cockpit.

### Inadimplência

- sem permissão: submenu oculto e abertura direta bloqueada;
- consulta: lê a coleção, sem botões de gestão;
- gestão: cria e atualiza título;
- múltiplas empresas: leitura consolidada permitida conforme escopo; cadastro exige empresa única;
- recebido: saldo deixa a carteira ativa;
- cancelado: não é fisicamente excluído;
- aging muda conforme competência/data de referência;
- índice = vencido / carteira em aberto;
- título >90 dias entra no bucket crítico.

### Firebase

- usuário fora do grupo/empresa não lê documento;
- `controladoria.inadimplencia` lê e não grava;
- `controladoria.inadimplenciaEditar` lê e grava;
- tentativa de mudar `grupoId` ou `empresaId` em update deve ser negada;
- delete de `inadimplenciaTitulos` deve ser negado.
