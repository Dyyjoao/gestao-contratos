# Migração Gestão Salvador → SIG

**Data-base:** 16/09/2026  
**Objetivo:** substituir gradualmente o sistema em Google Apps Script pelo SIG, mantendo uma única plataforma integrada.

## 1. Diretriz aprovada

O sistema atual em Apps Script é fonte de:
- requisitos;
- regras de negócio;
- dados;
- indicadores;
- históricos;
- fluxos operacionais existentes.

Ele **não é referência obrigatória de interface**.

O SIG mantém seus próprios padrões visuais, navegação, formulários, filtros, KPIs, permissões e dashboards. A migração deve aproveitar o que o Script sabe fazer sem copiar sua experiência genérica de input.

## 2. Método de migração

Cada tela seguirá o ciclo:

`leitura do Script → inventário da tela → desenho SIG → implementação em branch → CI → preview → homologação → ajustes → aprovação → Rules/persistência final → merge`

Não migrar vinte telas de uma vez. Fechar uma tela antes de avançar para a próxima reduz regressão e facilita comparação com o sistema atual.

## 3. Preview-first

Toda tela nova deve ser homologada em ambiente isolado antes de `main`.

A esteira de preview navegável ainda precisa ser configurada. Preferência: Firebase Hosting Preview Channels.

Não usar produção como ambiente de teste visual.

## 4. Inventário funcional levantado no código do Script

### Operação
1. **Produção**
   - Data;
   - Produção/Máquina;
   - Quantidade produzida;
   - Horas trabalhadas;
   - Produção por hora;
   - Item;
   - Concretador;
   - indicadores mensais/anuais;
   - total por produção/máquina;
   - média por hora.

2. **Descarte**
   - Data;
   - Quantidade;
   - Máquina/Produção;
   - Responsável pelo recolhimento;
   - total por produção/máquina;
   - total por responsável.

### Comercial
3. **Vendedor**
   - data da venda;
   - vendedor;
   - valor;
   - agrupamentos por vendedor.

4. **Consolidado de Vendas**
   - empresa;
   - cliente/código;
   - cidade;
   - vendedor;
   - tipo de cliente;
   - valor semanal;
   - acumulado;
   - período/importação.

5. **Material**
6. **Visitas**
7. **Reclamações**
8. **Orçamentos**

A tela principal do SIG continuará sendo **Vendas & Comissões**. Informações úteis de Vendedor/Consolidado serão incorporadas nela, não em uma segunda tela concorrente.

### Logística
9. **Entrega/Recolhimento de Pallets**
10. **Inventário de Pallets**

### Frota
11. **Abastecimento**
12. **Gestão de Veículos**
13. **Consumo Diesel**

A migração deve reaproveitar o módulo Frota já existente no SIG em vez de criar uma segunda gestão de veículos paralela.

### Financeiro
14. **Financeiro**
15. **Custo de EPI**

Antes de migrar, comparar com Contas a Pagar, Fluxo de Caixa, Controladoria e demais módulos existentes para eliminar redundância.

### RH
16. **Hora Extra**
17. **Quadro de Funcionários**
18. **Ativos por Setor**
19. **Ativos no Mês**

### Segurança
20. **Segurança**
21. **Treinamentos**

### Manutenção
22. **Ordem de Serviço**

## 5. Características técnicas do sistema atual

O Script utiliza Google Sheets como persistência. O código possui rotinas de leitura por abas, cache e otimizações com `CacheService` para manter desempenho.

Na migração para o SIG:
- não ligar o frontend diretamente a SQL local;
- manter Firebase enquanto essa for a arquitetura aprovada;
- caso banco local seja escolhido futuramente, usar API entre navegador e banco;
- migração de backend é projeto arquitetural separado da migração funcional das telas.

## 6. Cadastros mestres

Listas fixas do Script devem, quando fizer sentido, virar cadastros reutilizáveis no SIG.

Exemplos:
- máquinas/recursos produtivos;
- itens/produtos;
- concretadores/responsáveis;
- vendedores;
- motoristas;
- demais entidades repetidas entre telas.

Evitar hardcode quando o dado é operacionalmente alterável.

## 7. Dashboard

Todo módulo relevante migrado deve fornecer KPIs-base ao Dashboard, respeitando:
- empresa selecionada;
- período;
- permissões;
- natureza do indicador.

Dashboard é consumidor, não fonte.

Exemplos:
- Produção: produção do período, horas, produtividade média, principal recurso;
- Descarte: quantidade descartada e, se aprovado, índice de descarte sobre produção;
- Comercial: vendas, faturamento, meta, atingimento, comissão;
- Frota: indicadores operacionais quando incorporados explicitamente;
- RH/Segurança/Manutenção: apenas KPIs definidos durante a revisão da tela.

## 8. Produção — primeira tela

Status: **em homologação no PR #30; não mergeada em `main`**.

Escopo inicial:
- formulário especializado no padrão SIG;
- Data;
- Produção/Máquina;
- Quantidade;
- Horas trabalhadas;
- Produção por hora automática;
- Item;
- Concretador;
- filtros por ano/mês/recurso/item;
- KPIs;
- gráficos;
- histórico;
- estorno ADM;
- estrutura para cadastros próprios.

Regras identificadas no Script:
- LAJE usa conjunto específico de itens compatíveis;
- MAQ.1/MAQ.2 podem assumir BANDEJA quando item não informado, conforme implementação legada.

Essas regras serão homologadas visual e funcionalmente antes de serem tratadas como regra produtiva definitiva.

## 9. Descarte — próxima tela prevista

Depois de Produção fechada, migrar Descarte.

Não implementar automaticamente integração com DRE, Budget, estoque ou custo. Primeiro preservar operação e indicadores; qualquer integração gerencial/contábil é decisão separada.

## 10. Vendas

Diretriz aprovada:
- manter a tela SIG `Vendas & Comissões`;
- incorporar campos úteis do Script;
- preservar meta, venda, faturamento, comissão e performance já existentes;
- acrescentar cliente/código, cidade, tipo de cliente, período/importação e demais dados que forem confirmados na revisão da tela;
- preservar conceitualmente segregação por vendedor via perfis/permissões do SIG.

## 11. Permissões

Cada nova tela deve entrar no mesmo pacote com:
- menu/rota;
- grade de Perfis;
- autorização real de ações;
- Rules quando houver Firestore;
- QA de permissões.

Esconder menu não é segurança.

## 12. Correção e histórico

Todo módulo com input deve nascer compatível com a política administrativa do SIG:
- estorno como caminho normal;
- Administrador + senha atual + motivo;
- histórico preservado;
- auditoria;
- delete físico apenas excepcional e seguro.

## 13. Objetivo do ciclo atual

Há um ciclo de aproximadamente um mês para implementar as mudanças necessárias. A prioridade é velocidade com controle: tela por tela, preview e homologação contínua, sem perder as diretrizes já aprovadas do SIG.

## 14. Não aprovado / não implementar silenciosamente

- substituir Firebase por banco local;
- tornar VPN obrigatória;
- ativar Storage;
- transformar o SIG em multi-tenant por URL;
- criar app nativo;
- integrar automaticamente Produção/Descarte a DRE/custos/estoque;
- alterar permissões dos módulos existentes.

Esses pontos exigem decisão explícita.