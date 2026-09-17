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
| Operação | Produção | Em homologação — primeira tela da migração |
| Operação | Descarte | Próxima após fechamento de Produção |
| Demais áreas | Inventário acima | Aguardando tratamento tela por tela |

### Produção — contrato de migração

A primeira tela preserva do Script: data, produção/máquina, quantidade produzida, horas trabalhadas, produção por hora, item e concretador. Também preserva a regra específica de LAJE e o preenchimento de BANDEJA para MAQ.1/MAQ.2 quando o item não estiver informado.

No SIG a tela passa a ter histórico auditável, filtros, KPIs, visão mensal, visão anual, total por recurso e média por hora. As listas-base do Script são tratadas como base inicial e a arquitetura já prevê cadastros operacionais próprios.

Estorno de lançamento segue a diretriz administrativa do SIG: Administrador, reautenticação pela senha atual, motivo obrigatório e auditoria. Estornos deixam de compor indicadores sem apagar o histórico.

### Produção — persistência e publicação

As coleções `producaoLancamentos` e `operacaoCadastros` são segregadas por `grupoId` e `empresaId`. As Rules versionadas na branch de homologação permitem leitura conforme as permissões de Produção, criação de lançamentos para quem pode lançar, edição de registros ativos para quem pode editar, e gestão de cadastros para quem possui a permissão correspondente. Estorno permanece ação administrativa com trilha na coleção `auditoriaAdministrativa`; exclusão física é bloqueada.

O frontend no GitHub Pages e as Firestore Rules são publicados separadamente. Antes de liberar gravação real, publicar as Rules completas deste commit no projeto Firebase correto e testar com usuário autorizado, usuário sem permissão e Administrador. Uma prévia estática da interface não grava no Firebase nem comprova as Rules publicadas.

Nenhuma integração contábil, financeira ou operacional nova será criada automaticamente apenas porque existe no Script; mudanças de regra ou de integração continuam exigindo decisão explícita.
