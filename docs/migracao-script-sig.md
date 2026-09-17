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
| Comercial | Visitas, Orçamentos e Reclamações | Preparados no lote, aguardando publicação conjunta de Rules |
| Logística | Entrega/recolhimento e Inventário de pallets | Preparados no lote, aguardando publicação conjunta de Rules |
| Manutenção | Ordens de Serviço | Preparada no lote, aguardando publicação conjunta de Rules |
| RH | Horas extras; Quadro; Ativos por setor; Ativos no mês | Preparados no lote, aguardando publicação conjunta de Rules |
| Segurança | Ocorrências; Treinamentos | Preparados no lote, aguardando publicação conjunta de Rules |
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

Orçamentos abertos (`aguardando_aprovacao` ou `licitacao`) entram na Minha Mesa do responsável e no resumo comercial do Dashboard. Cada novo orçamento aberto recebe próximo contato em 24 horas. Registrar o contato acrescenta um evento ao histórico do orçamento e renova o prazo por 24 horas; mudar para `venda_concluida` ou `perdido_concorrente` retira o item da fila. Esta é uma fila operacional exibida ao abrir o SIG; não envia mensagem automática fora do aplicativo. O status de venda concluída **não cria lançamento em Vendas & Comissões, DRE ou Caixa**. Edição exige permissão; exclusão física permanece bloqueada.

`reclamacoesComerciais` preserva data, cliente, vendedor, motivo, cidade, produto, histórico e e-mail do vendedor. O SIG acrescenta status `aberta` → `em_analise` → `resolvida`, eventos cronológicos de tratamento, visão própria do responsável e consolidação para quem pode supervisionar. A consulta segue Grupo/Empresa, não há delete físico e a tela não cria lançamento financeiro.

### Logística — Pallets

`palletMovimentos` guarda data, motorista, quantidade entregue e recolhida. O resumo por motorista no mês segue a regra indicativa do Script: **mais de 500** pallets recolhidos → referência de R$ 120,00. É um indicador, não gera pagamento, comissão ou obrigação financeira automaticamente. `palletInventarios` registra data, tipo e quantidade; o balanço mensal reproduz as linhas de pallets com material, vazios, total físico, diferença frente ao mês anterior, entradas, saídas, compras e saldo/perda. O Dashboard recebe os totais de entregas/recolhimentos do período selecionado.

Os movimentos são segregados por Grupo/Empresa e permissões próprias para entregas e inventário. Estorno preserva histórico e retira o registro dos cálculos; não há exclusão física. O cadastro histórico ainda não foi importado e não há reconciliação automática entre inventário e entregas até validar a base anterior.

### Manutenção — Ordem de Serviço

`ordensServico` preserva número da OS, tipo (corretiva, melhoria, preventiva), solicitante, data, função, equipamento, serviço solicitado, executante, datas de início/fim, serviço realizado, parada de produção, troca de peça e observação. O fluxo é `aberta` → `em_execucao` → `concluida`, derivado das datas; conclusão exige descrição do serviço realizado. Cancelamento é ação administrativa com reautenticação, motivo e auditoria, preservando o histórico. O Dashboard mostra OS abertas e em execução; uma OS não cria automaticamente manutenção na ficha de Frota nem lançamento financeiro.

### RH e Segurança

As abas de RH preservam horas extras 50%/100% e valor por setor; admissões, demissões, atestados e afastamentos >15 dias por data; ativos por setor; e ativos no mês. A última posição de ativos, e a última posição de cada setor, são **fotografias**, não fluxos somáveis ao longo do ano. O quadro de movimentações (admissões menos demissões) é um fluxo separado.

Segurança registra acidentes de trabalho/trajeto com quantidades e treinamentos com setor, tipo, data, nome, local, carga horária, horário, instrutor, custo e público. As seis coleções têm permissões próprias de consulta, lançamento e edição, segregação Grupo/Empresa, estorno administrativo auditado e bloqueio de delete físico. RH e Segurança recebem indicadores no Dashboard. Nenhum desses registros cria folha, obrigação financeira ou lançamento contábil automaticamente.

### Frota — Combustível e Diesel

`abastecimentosFrota` registra consumo e recebimento de diesel em litros, data, motorista, placa e quilometragem. Cada lançamento aponta para um veículo existente da mesma empresa; o perfil precisa das permissões de **Combustível** e de consulta à **Frota**. O estoque exibido é derivado dos movimentos ativos da empresa selecionada, sem gravar saldos como fonte paralela. Uma edição ou estorno recalcula os indicadores. O formulário impede saldo final negativo com os movimentos carregados, mas lançamentos simultâneos exigem conferência operacional antes de fechar o período.

`custosDiesel` registra data e valor informado, separado dos litros. Esses valores não criam lançamento no Caixa ou na DRE. Edição exige permissão, e estorno é exclusivo de Administrador com reautenticação, motivo e auditoria. Não existe exclusão física. A coleção de veículos do SIG continua sendo o cadastro único; a planilha de Gestão de Veículos requer mapeamento e reconciliação antes de importar registros históricos.

### Telas existentes e dados ainda não importados

Vendedor, Vendas e Consolidado de Vendas usam a carteira já existente de Vendas & Comissões e o Dashboard. Material, Financeiro e Custo de EPI dependem de classificação e reconciliação com receitas, Caixa, FP&A e Almoxarifado existentes antes de importar valores históricos; registrar o mesmo valor novamente produziria dupla contagem. O lote prepara as telas operacionais independentes e suas Rules, sem transferir as linhas das planilhas.

### RH — cadastro, vínculos e indicadores (segunda etapa)

`rhColaboradores` é o cadastro de vínculos: matrícula interna, nome, setor, data real de admissão, data de demissão quando ocorrer, jornada mensal prevista e vínculo opcional à conta de usuário do SIG. O botão **Admitir colaborador** cria cadastro e admissão no mesmo ato; **Registrar demissão** preenche a data no próprio vínculo. Recontratação cria um novo vínculo, podendo reutilizar a matrícula somente depois do encerramento do anterior. Comece cadastrando também o quadro já existente com suas datas reais, para estabelecer a base. O quadro do fim do mês é calculado das datas; uma demissão no último dia sai do fechamento daquele mês. Não é necessário preencher mensalmente `rhAtivosMes` ou `rhAtivosSetor`.

`rhAusencias` registra colaborador, data, categoria operacional (falta, atestado, atraso, afastamento ou outros), horas e observação sem diagnóstico/CID. Absenteísmo = horas ausentes ÷ horas previstas × 100. Horas previstas vêm da jornada mensal de cada vínculo, proporcional aos dias corridos de admissão/demissão no mês; não descontam férias, feriados, afastamentos prolongados ou escalas especiais automaticamente. Quem necessita dessa precisão deve conferir e ajustar a jornada de referência antes de interpretar a taxa. `rhHorasColaboradores` guarda data, colaborador, setor do registro e horas 50% e 100%. O relatório agrega por pessoa, setor e mês ou intervalo. Turnover adotado = demissões no período ÷ média entre quadro de abertura e fechamento × 100. O quadro é de vínculos, não de pessoas únicas ao longo de recontratações.

As coleções anteriores `rhQuadro`, `rhAtivosMes`, `rhAtivosSetor` e `rhHorasExtras` permanecem para consulta e reconciliação histórica, mas a nova tela não cria registros nelas e não soma seus totais aos indicadores novos. O Dashboard de RH lê o cadastro novo. Importação de dados históricos exige correspondência confiável de colaborador, matrícula e datas; não é automática.

`rhAvaliacoes360` contém ciclo, avaliado, avaliador, perspectiva (autoavaliação, liderança, par ou liderado), notas inteiras de 1 a 5 para colaboração, entrega, comunicação, iniciativa e liderança, e comentário. O RH registra e consulta os dados com permissão específica. A média por pessoa equilibra as perspectivas presentes: primeiro calcula a média de cada perspectiva, depois a média entre perspectivas; ciclos incompletos não se tornam uma avaliação completa por inferência. Avaliações e comentários não são expostos na Minha Mesa.

`rhAcoes` guarda competência, data, tipo (endomarketing, melhoria ou treinamento), título, descrição, situação e colaboradores envolvidos. A Minha Mesa de cada participante **com conta SIG vinculada** mostra a ação; quem não tem conta vinculada permanece no cadastro, mas não recebe item pessoal. O evento de treinamento RH é uma agenda, separado do registro de Segurança do Trabalho. Atualizar um vínculo de usuário após agendar exige revisar os participantes da ação para atualizar a distribuição. Todas as novas coleções têm escopo Grupo/Empresa, permissões por perfil, estorno administrativo auditado e bloqueio de exclusão física. As Rules devem ser publicadas integralmente junto à versão do site.

### Ajuste de seletores de ano

As telas de Produção, Descarte, Pallets, Segurança e Combustível exibem o ano atual desde a montagem, mesmo quando a consulta falha ou as Rules ainda não foram publicadas. Isso remove a caixa de seleção vazia que aparecia como apenas uma seta em várias páginas.

A interface separa cadastro/indicadores, avaliação 360 e ações em páginas próprias. Ao abrir o RH, consulta os vínculos; ao abrir Absenteísmo ou Horas extras, consulta só a coleção daquela aba. A Minha Mesa busca apenas ações cuja lista de participantes inclui a conta logada, somente quando a página é aberta. A checagem de edição de um vínculo com eventos existentes consulta os eventos vinculados antes de salvar. Com histórico volumoso, as coleções de eventos ainda precisarão de paginação e índices por período, medidos com uso real; não se deve carregar avaliações e ações junto com o quadro.
