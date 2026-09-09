# SIG — Gestão de Frota v1

**Data-base:** 08/09/2026  
**Natureza:** módulo operacional de primeiro nível, fora da Controladoria & FP&A.

## 1. Objetivo

A Gestão de Frota centraliza veículos, vencimentos, infrações, manutenção, custos e vínculo patrimonial sem transformar o SIG em sistema de telemetria ou substituir os portais oficiais de trânsito.

Princípios:

- Frota é módulo operacional independente da Controladoria;
- acesso é segregado pelas permissões já existentes do módulo `frota`;
- obrigações e multas preservam histórico dentro da ficha do veículo;
- manutenção usa coleção própria `manutencoesFrota`;
- não há exclusão física exposta na interface da v1; baixa/inativação preserva histórico;
- vínculo contábil é manual e usa contas analíticas previamente cadastradas;
- integração ao Imobilizado só é executada por usuário que também possua autorização de Imobilizado;
- nenhuma credencial de serviço governamental deve ser armazenada no frontend/PWA.

## 2. Navegação

Menu de primeiro nível:

`Gestão de Frota`

Posicionamento preferencial: após Vendas & Comissões e antes da Controladoria, mantendo a navegação operacional separada de FP&A.

A antiga rotina de `management-shell.js` removia Frota e suas permissões por tratar o módulo como legado. A v1 remove Frota dessa lista de módulos legados.

## 3. Cockpit gerencial

Indicadores principais:

- frota ativa;
- obrigações vencidas;
- vencimentos/revisões nos próximos 30 dias;
- manutenções abertas;
- custo da frota nos últimos 12 meses;
- score de saúde da frota.

O score é uma leitura gerencial de exceções. Ele considera obrigações vencidas, manutenções vencidas e veículos ativos ainda sem vínculo patrimonial. Não substitui indicador técnico de segurança veicular.

### Posição por veículo

Cada veículo mostra:

- placa / identificação;
- status;
- quilometragem;
- próximo vencimento;
- situação de manutenção;
- custo dos últimos 12 meses;
- situação do vínculo com Imobilizado.

## 4. Cadastro do veículo

Campos principais:

- empresa;
- placa;
- RENAVAM;
- marca/modelo;
- ano/modelo;
- status;
- quilometragem atual;
- data e valor de aquisição;
- responsável/condutor principal;
- observações.

Status previstos:

- ativo;
- em manutenção;
- inativo;
- baixado/vendido.

Baixa não exclui fisicamente a ficha.

## 5. IPVA, licenciamento, multas e demais obrigações

Na v1 as obrigações são registradas dentro da ficha do veículo (`veiculos.obrigacoes`). Isso aproveita as Rules existentes de `veiculos` e a permissão `frota.obrigacoes`, evitando criar uma nova coleção sem necessidade imediata.

Tipos iniciais:

- IPVA;
- licenciamento;
- multa/infração;
- seguro;
- recall;
- outro.

Campos incluem:

- exercício/parcela;
- vencimento;
- valor;
- status;
- data de pagamento;
- auto/referência;
- órgão autuador;
- pontos;
- condutor/responsável;
- descrição;
- usuário/data de criação e atualização.

Status operacionais:

- aberto;
- vencido (calculado pela data);
- em recurso;
- pago;
- cancelado.

A interface não apaga o registro como caminho normal de correção. Pagamentos e mudanças de situação permanecem no histórico do veículo.

## 6. Consulta oficial e automação

### Situação atual

A SENATRAN oferece consulta online de dados e infrações de veículos nos seus serviços oficiais. Para uma operação sem integração contratada, o SIG oferece **consulta assistida**:

1. abrir o portal oficial da SENATRAN;
2. realizar a consulta autenticada;
3. registrar no veículo a data da última conferência;
4. programar a próxima conferência, inicialmente em 30 dias;
5. lançar/atualizar as obrigações encontradas.

### Automação futura

Existe serviço oficial para pessoa jurídica de consulta de dados de veículos, condutores e infrações via solução de integração Senatran/Serpro. Caso a empresa contrate o serviço, a arquitetura recomendada é:

`SIG → backend seguro / Cloud Function → Serpro/SENATRAN → normalização → prévia/diferenças → atualização da Frota`

Nunca:

`browser/PWA → credencial secreta Serpro`

Tokens, certificados ou credenciais não devem entrar no repositório nem no JavaScript público.

Referências oficiais usadas no desenho:

- Portal de Serviços SENATRAN: https://portalservicos.senatran.serpro.gov.br/
- Consulta de infrações: https://www.gov.br/pt-br/servicos/consultar-online-suas-infracoes-de-transito
- Solução digital de consulta Senatran/Serpro para PJ: https://www.gov.br/pt-br/servicos/contratar-consulta-denatran

## 7. Manutenções

Coleção existente:

- `manutencoesFrota`.

Controle por:

- tipo (preventiva, corretiva, revisão, pneus etc.);
- status;
- serviço/descrição;
- oficina/fornecedor;
- data prevista;
- KM limite;
- custo previsto;
- data/KM realizados;
- custo realizado;
- próxima revisão por data e/ou KM;
- observações.

Uma manutenção é sinalizada como vencida quando:

- a data prevista passou; ou
- o veículo alcançou/superou o KM limite.

É sinalizada como próxima quando:

- vence em até 30 dias; ou
- faltam até 1.000 km para o limite.

Ao concluir uma manutenção com KM superior ao cadastro atual do veículo, o SIG atualiza a quilometragem da ficha.

## 8. Custo da Frota

O custo de 12 meses da v1 combina:

- manutenções concluídas com custo realizado;
- obrigações pagas (IPVA, licenciamento, multas, seguro etc.).

É uma visão operacional de TCO simplificado. Não substitui o custo contábil completo e não gera lançamento automático de despesa.

## 9. Plano de Contas e Imobilizado

O veículo pode receber manualmente:

- conta patrimonial do Ativo;
- conta de depreciação acumulada;
- conta de despesa de depreciação;
- vida útil estimada;
- data disponível para uso;
- opção de projetar depreciação em Budget/Forecast.

A conta patrimonial é selecionada somente entre contas analíticas vigentes do Plano de Contas.

### Regra de autorização

Permissões de Frota autorizam a operação da frota. A criação/alteração da ficha em `imobilizados` continua exigindo a autorização de Imobilizado/Controladoria já existente.

Consequência:

- operador de Frota pode cadastrar o veículo;
- se não tiver autorização patrimonial, o cockpit mostra **Vínculo patrimonial pendente**;
- usuário autorizado de Imobilizado pode completar o mapeamento e sincronizar;
- quando sincronizado, o veículo passa a compor a coleção `imobilizados` com `origem: "frota"` e `veiculoId`.

Isso evita dar poder contábil a um perfil operacional apenas porque ele gerencia a frota.

## 10. Firebase

A v1 foi desenhada para utilizar a autorização já versionada:

- `veiculos`;
- `manutencoesFrota`;
- `imobilizados` quando houver integração patrimonial.

Permissões existentes:

- `frota.visualizar`;
- `frota.cadastrar`;
- `frota.editar`;
- `frota.manutencao`;
- `frota.obrigacoes`;
- `frota.excluir` permanece como chave legada no perfil, mas a v1 não expõe exclusão física na UI.

A integração patrimonial respeita adicionalmente `controladoria.imobilizado` ou administração FP&A.

Como não foi criada coleção nova nesta versão, não há ampliação necessária do contrato das Firestore Rules. Ainda assim, `SIG Firebase Contract Check` e o contrato específico de Frota devem validar que `veiculos`, `manutencoesFrota` e `imobilizados` continuam protegidos.

## 11. CSS e sidebar

A expansão do submenu da Controladoria evidenciou que `.sidebar` possuía `height: 100vh` sem rolagem vertical. Com vários itens, o conteúdo ultrapassava o fundo azul e aparecia sobre a área clara da aplicação.

Correção:

- `sidebar-layout.css`;
- sidebar com rolagem vertical própria;
- suporte a `100dvh`;
- overflow horizontal bloqueado;
- scrollbar discreta;
- comportamento mobile preservado.

Não se reduz fonte nem se escondem opções para “fazer caber”.

## 12. QA mínimo

Antes de promover:

1. sintaxe de `js/fleet.js`;
2. Frota deve ser módulo de primeiro nível;
3. `management-shell.js` não pode remover `menuFrota`, `pagina-frota` nem as permissões `frota`;
4. perfil deve manter Visualizar/Cadastrar/Editar/Manutenção/Obrigações;
5. Rules devem conter `veiculos`, `manutencoesFrota` e `imobilizados`;
6. browser smoke deve conseguir importar `fleet.js` e criar `pagina-frota`;
7. submenu da Controladoria expandido deve permanecer contido na sidebar com rolagem;
8. cadastro de veículo sem autorização de Imobilizado não pode ganhar poder contábil por consequência;
9. veículo com autorização patrimonial deve gerar/atualizar vínculo em `imobilizados`;
10. documentação e README precisam ser atualizados no mesmo release.
