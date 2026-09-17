# Migração Gestão Salvador → SIG

## Diretriz aprovada

O sistema atual em Google Apps Script é fonte de requisitos, regras de negócio, dados, indicadores e históricos. Ele não é referência obrigatória de interface.

### Experiência de uso

- O SIG mantém seus próprios padrões visuais, navegação, formulários, filtros, KPIs e telas dedicadas.
- Não reproduzir a tela genérica de input do Script quando o SIG já tiver uma experiência especializada melhor.
- Cada módulo migrado deve ter uma tela própria coerente com o restante do SIG.
- Cadastros repetidos ou listas fixas do Script devem, quando fizer sentido, virar cadastros mestres do SIG em vez de permanecer hardcoded.

### Dashboard

- Todo módulo relevante deve fornecer KPIs-base ao Dashboard do SIG.
- Os indicadores devem respeitar empresa selecionada, período e permissões do usuário.
- O Dashboard é uma visão executiva e não substitui a tela operacional de origem.
- O usuário deve conseguir partir do indicador para o módulo correspondente quando houver navegação disponível.

### Comercial

- `Vendas & Comissões` permanece como tela comercial principal do SIG.
- Informações úteis existentes no Script serão incorporadas nessa tela durante a revisão específica do módulo, em vez de criar uma segunda tela de vendas paralela.
- A segregação de acesso por vendedor deve ser preservada conceitualmente, implementada pelos perfis e permissões do SIG.

## Inventário funcional levado do Script

O inventário-base confirmado no código do Gestão Salvador é:

- **Operação:** Produção; Descarte.
- **Comercial:** Vendedor/Vendas; Consolidado de Vendas; Material; Registro de Visita; Reclamação de Cliente; Orçamentos.
- **Logística:** Entrega e Recolhimento de Pallet; Inventário de Pallet.
- **Frota:** Abastecimento; Gestão de Veículos; Consumo Diesel.
- **Financeiro:** Financeiro; Custo de EPI.
- **RH:** Hora Extra; Quadro de Funcionários; Ativos por Setor; Ativos no Mês.
- **Segurança:** Segurança; Treinamento.
- **Manutenção:** Ordem de Serviço.

Esse inventário representa o que precisa ser analisado no processo de substituição. Ele não significa copiar todas as telas ou manter controles redundantes quando o SIG já possuir um módulo melhor.

## Ritmo de implantação

A migração será feita tela por tela, sempre em branch/PR de homologação antes do merge em `main`. Para cada tela serão fechados:

1. campos e cadastros;
2. regras e cálculos;
3. indicadores e gráficos;
4. permissões;
5. histórico e dados existentes;
6. integrações com outros módulos do SIG;
7. o que deve ser mantido, redesenhado ou eliminado por redundância;
8. quais KPIs sobem para o Dashboard.

### Status

| Área | Tela | Status |
|---|---|---|
| Estrutura | Navegação por áreas | Implementada em `main` |
| Operação | Produção | Tela na `main`; Rules versionadas, publicação Firebase pendente |
| Operação | Descarte | Implementada em branch de preparação; aguardando publicação conjunta de Rules |
| Comercial | Visitas e contatos; Orçamentos | Preparados no lote, aguardando publicação conjunta de Rules |
| Demais áreas | Inventário acima | Aguardando tratamento tela por tela |

### Produção — contrato de migração

A primeira tela preserva do Script: data, produção/máquina, quantidade produzida, horas trabalhadas, produção por hora, item e concretador. Também preserva a regra específica de LAJE e o preenchimento de BANDEJA para MAQ.1/MAQ.2 quando o item não estiver informado.

No SIG a tela passa a ter histórico auditável, filtros, KPIs, visão mensal, visão anual, total por recurso e média por hora. As listas-base do Script são tratadas como base inicial e a arquitetura já prevê cadastros operacionais próprios.

Estorno de lançamento segue a diretriz administrativa do SIG: Administrador, reautenticação pela senha atual, motivo obrigatório e auditoria. Estornos deixam de compor indicadores sem apagar o histórico.

### Produção — persistência e publicação

As coleções `producaoLancamentos` e `operacaoCadastros` são segregadas por `grupoId` e `empresaId`. As Rules versionadas na branch de homologação permitem leitura conforme as permissões de Produção, criação de lançamentos para quem pode lançar, edição de registros ativos para quem pode editar, e gestão de cadastros para quem possui a permissão correspondente. Estorno permanece ação administrativa com trilha na coleção `auditoriaAdministrativa`; exclusão física é bloqueada.

O frontend no GitHub Pages e as Firestore Rules são publicados separadamente. Antes de liberar gravação real, publicar as Rules completas deste commit no projeto Firebase correto e testar com usuário autorizado, usuário sem permissão e Administrador. Uma prévia estática da interface não grava no Firebase nem comprova as Rules publicadas.

Nenhuma integração contábil, financeira ou operacional nova será criada automaticamente apenas porque existe no Script; mudanças de regra ou de integração continuam exigindo decisão explícita.

### Descarte — contrato de migração

Fonte: `Salvador.gs` v1.8.8, aba `Descarte`. Campos: Data, Quantidade não negativa, Máquina (`MAQ.1`, `MAQ.2`, `LAJE`) e Responsável pelo recolhimento (`ARTUR`, `GIL`, `PAULO`). O SIG apresenta filtro por ano, mês e máquina, totais por máquina e responsável, histórico e KPI para o Dashboard. Lançamentos são segregados por Grupo/Empresa; edição exige permissão e estorno exige Administrador, reautenticação, motivo e auditoria. Não há exclusão física.

A Rule de `descarteLancamentos` está preparada para ser publicada junto com os demais módulos. Até que a publicação completa no Firebase ocorra, a tela não deve ser tratada como funcional para gravação real. O arquivo de origem foi utilizado apenas para análise e não contém dados migrados automaticamente.

## Mapa de migração do Script v1.8.8 (17/09/2026)

O código `Salvador.gs` e o cliente `Index.html` foram conferidos. Os arquivos de origem não são importados para o repositório, pois contêm listas e dados operacionais. A classificação abaixo indica o destino funcional; cada integração deve conservar o escopo Grupo/Empresa, permissões e histórico. A base antiga continua separada até uma importação de dados planejada.

| Tela no Script | Destino no SIG | Tratamento necessário |
|---|---|---|
| Produção | Operação → Produção | Tela na `main`; Rules versionadas, publicação Firebase pendente. |
| Descarte | Operação → Descarte | Tela e Rule preparadas em branch de migração. |
| Vendedor / Vendas | Vendas & Comissões | Conferir correspondência de vendedor, valor e datas; evitar segunda carteira de vendas. |
| Consolidado de Vendas | Vendas & Comissões / Dashboard | Agregar dados da fonte única de vendas. |
| Material | Vendas & Comissões | Definir classificação de material/local por venda sem duplicar receitas. |
| Registro de Visita | Comercial: funil e Minha Mesa | Registro de interação com vendedor, cliente, obra, canal e follow-up. |
| Reclamação de Cliente | Comercial: atendimento | Histórico e responsável com acompanhamento de situação. |
| Orçamentos | Comercial: funil e Minha Mesa | Status e justificativa; aprovação e cobrança periódica conforme fluxo acordado. |
| Entrega e Recolhimento de Pallet | Logística | Movimentos por motorista, totais mensal/anual e regra indicativa acima de 500 recolhidos no mês. |
| Inventário de Pallet | Logística | Saldo físico mensal, compras, entradas e saídas, comparativo e perdas. |
| Abastecimento | Frota | Vincular por placa à ficha existente; diferenciar consumo e recebimento; KM e estoque de diesel. |
| Gestão de Veículos | Frota existente | Mapear campos legados sem duplicar cadastro de veículos. |
| Consumo Diesel | Frota / custos gerenciais | Avaliar se o valor já existe em outro lançamento para evitar dupla contabilização. |
| Financeiro | Caixa / FP&A existentes | Relacionar naturezas legadas a contas analíticas, sem lançar automaticamente em DRE/Caixa. |
| Custo de EPI | Almoxarifado / FP&A | Definir se custo é compra, entrega ou competência antes de integrar. |
| Hora Extra | RH | Horas 50%, 100% e custo por setor e data. |
| Quadro de Funcionários | RH | Admissões, demissões, atestados e afastamentos por competência. |
| Ativos por Setor | RH | Fotografia por setor/data, sem somar fotografias como fluxo. |
| Ativos no Mês | RH | Fotografia mensal reconciliável com o quadro. |
| Segurança | Segurança do Trabalho | Acidentes de trabalho e de trajeto por data/quantidade. |
| Treinamento | Segurança do Trabalho | Agenda, setor, carga horária, instrutor, público e custo. |
| Ordem de Serviço | Manutenção | Solicitação → execução → conclusão, evidenciando parada e troca de peça. |

### Publicação das Rules em lote

- Cada tela nova recebe coleção, permissão, Rule e QA no mesmo PR de preparação.
- Não publicar Rules parciais enquanto o lote estiver em desenvolvimento; publicar o `firestore.rules` **integral** da versão da `main` que contiver as telas liberadas.
- A equipe só poderá testar gravação real das novas coleções depois dessa publicação. O site e o Firebase são deploys independentes.
- O cadastro de dados históricos do Script requer migração específica com reconciliação, origem e chaves de idempotência; as telas novas não importam automaticamente as planilhas antigas.

### Comercial — Visitas e Orçamentos

As telas preservam os campos de `Registro Visita` e `Orçamento` do Script. No SIG, `visitasComerciais` e `orcamentosComerciais` pertencem ao Grupo/Empresa e ao usuário que registrou o atendimento (`responsavelId`). Usuário comum consulta apenas os próprios registros; a permissão `supervisionar` dá visão consolidada da equipe. Vendedor continua como informação comercial textual; **não há mapeamento automático** entre os e-mails do Script e as contas do SIG. Esse vínculo deve ser definido antes de importar o histórico.

Orçamentos abertos (`aguardando_aprovacao` ou `licitacao`) entram na Minha Mesa do responsável e no resumo comercial do Dashboard. Cada novo orçamento aberto recebe próximo contato em 24 horas. Registrar o contato preserva o resultado e renova o prazo por 24 horas; mudar para `venda_concluida` ou `perdido_concorrente` retira o item da fila. Esta é uma fila operacional exibida ao abrir o SIG; não envia mensagem automática fora do aplicativo. O status de venda concluída **não cria lançamento em Vendas & Comissões, DRE ou Caixa**. Edição exige permissão; exclusão física permanece bloqueada.
