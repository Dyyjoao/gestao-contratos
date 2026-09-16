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

### Migração por tela

Depois da organização estrutural do menu, a migração será feita tela por tela. Para cada módulo serão comparados:

1. campos e cadastros;
2. regras e cálculos;
3. indicadores e gráficos;
4. permissões;
5. histórico e dados existentes;
6. integrações com outros módulos do SIG;
7. o que deve ser mantido, redesenhado ou eliminado por redundância.

Nenhuma integração contábil, financeira ou operacional nova será criada automaticamente apenas porque existe no Script; mudanças de regra ou de integração continuam exigindo decisão explícita.