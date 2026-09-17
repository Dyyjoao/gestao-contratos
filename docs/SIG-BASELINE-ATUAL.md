# SIG — Baseline Atual

**Data-base:** 16/09/2026  
**Repositório:** `Dyyjoao/gestao-contratos`  
**Branch de produção:** `main`  
**Projeto Firebase:** `gestao-de-contratos-b266b`

Este documento registra a baseline vigente do SIG e prevalece, em caso de conflito, sobre descrições históricas antigas ainda preservadas em `/docs`.

## 1. Diretriz de produto

O SIG é o sistema integrado de gestão que deve concentrar controles operacionais, comerciais, financeiros, de controladoria e gestão da empresa. O sistema em Google Apps Script usado hoje pela empresa passa a ser **fonte de requisitos, regras, dados, indicadores e históricos**, não referência obrigatória de interface.

A migração será feita **tela por tela**, preservando o padrão visual e de experiência do SIG. Não copiar telas genéricas do Script quando o SIG puder oferecer uma tela especializada melhor.

Todo módulo relevante deve fornecer seus KPIs-base ao Dashboard, respeitando empresa, período e permissões do usuário.

## 2. Navegação vigente

A navegação foi reorganizada por áreas.

### Comercial
- Vendas & Comissões

### Controladoria & FP&A
A Controladoria passou a reunir visualmente, além dos módulos nativos, os seguintes módulos independentes:
- Contratos
- Contas a Pagar
- Permutas
- Consórcios

Essa mudança é **somente de navegação**. Coleções, módulos, permissões e regras permanecem próprios. Não transformar, sem decisão explícita, `contratos`, `contasPagar`, `permutas` ou `consorcios` em permissões internas de `controladoria`.

### Operação
A área Operação será incorporada na migração do Script. A primeira tela em homologação é **Produção** no PR #30. Enquanto não houver aprovação, Rules e merge, Produção não é funcionalidade de produção.

## 3. Política de release

Fluxo padrão obrigatório para funcionalidade nova ou mudança relevante:

`feature branch → CI verde → preview isolado → homologação visual/funcional → ajustes → aprovação → merge em main → produção`

Não usar merge em `main` como forma de gerar preview. O repositório ainda precisa concluir a esteira de preview do Firebase Hosting para que cada PR tenha URL de homologação navegável.

Mudanças documentais isoladas podem ser promovidas separadamente quando não alterarem comportamento funcional.

## 4. Firebase e segurança

Arquitetura atual:

`Web/PWA → Firebase Authentication → Cloud Firestore`

Firebase continua sendo a arquitetura vigente. Banco local/API própria, VPN obrigatória, domínio SaaS multi-tenant e app nativo são direções futuras em avaliação e **não estão aprovadas como substituição da arquitetura atual**.

Regras permanentes:
- autenticação não substitui autorização;
- Grupo e Empresa são fronteiras de segurança;
- Rules são a barreira efetiva de backend;
- GitHub Pages não publica Firestore/Storage Rules;
- toda alteração de `firestore.rules` exige publicação Firebase separada e aviso explícito;
- `storage.rules` é independente de `firestore.rules`;
- Firebase Storage permanece **adiado/não ativo para a operação atual**;
- segredos, tokens, certificados e service accounts nunca ficam no frontend.

## 5. Correções administrativas

Todo módulo que persiste input deve possuir caminho auditável de correção.

Padrão:
- estorno como correção normal;
- Administrador reautentica com a senha do usuário logado;
- motivo obrigatório;
- registro de quem/quando/por quê;
- preservação do histórico;
- neutralização do efeito ativo;
- `auditoriaAdministrativa` append-only.

Exclusão física é excepcional, apenas para duplicidade/teste/dado seguro, exige Administrador + reautenticação + motivo + auditoria e não deve ocorrer quando houver dependências ou histórico relevante.

## 6. DRE e Plano de Contas

Plano v6:
- máscara `#.##.##.####`;
- raízes 1 Ativo, 2 Passivo, 3 Receita, 4 Despesa, 9 Estatística;
- somente Analíticas são lançáveis;
- `codigoReduzido` é referência externa opcional do Pangéia e nunca dirige hierarquia, consolidação ou cálculo.

DRE aprovada e vigente:
- DRE Gerencial é a visão principal;
- `Detalhar contas`;
- `Estrutura do plano`;
- `Outras visualizações`;
- `DRE Societária · CPC 51`;
- totalizadores como Margem de Contribuição e EBITDA são calculados, não contas lançáveis;
- classificação por Tipo, Linha DRE Gerencial e Categoria CPC 51.

## 7. Contratos e planejamento

Contratos podem dirigir Budget/Forecast, Contas a Pagar e provisões de Caixa conforme flags e parametrizações do próprio contrato.

Campos/regras relevantes:
- `planejamentoAtivo`;
- `fluxoCaixaAtivo`;
- conta gerencial analítica de resultado;
- Centro de Custo autorizado;
- dia de vencimento;
- regra de reajuste;
- comentário de planejamento.

Conta de contrato deve ser Analítica de Resultado (raízes 3/4), ativa no exercício e, quando usada em planejamento, autorizada no Centro de Custo.

Reajuste utiliza motor compartilhado. Alterações de percentual, referência, renovação, vigência ou demais parâmetros relevantes devem reconciliar competências futuras/abertas e preservar estados pagos, realizados ou fechados. O SIG **não consulta automaticamente IPCA/IGP-M externos**; o percentual/referência é atualizado no contrato pelo usuário.

## 8. Contas a Pagar

Contas a Pagar é cockpit operacional de compromissos fixos e vencimentos. Mesmo aparecendo dentro de Controladoria, continua com módulo/permissões próprios.

Regras:
- não alimenta automaticamente DRE, Budget, Forecast ou Fluxo de Caixa;
- pode ser alimentado por Contratos;
- contrato recalcula obrigações futuras/abertas conforme reajuste;
- itens pagos/estornados são preservados;
- obrigação antiga em aberto não deve ser cancelada apenas por estar fora da janela de geração;
- conta bancária planejada é vinculada no lançamento;
- pagamento pode registrar conta efetiva conforme permissão vigente;
- filtros e impressão respeitam a conta bancária.

## 9. Migração do sistema Script

Inventário funcional levantado no código atual:
- Operação: Produção, Descarte;
- Comercial: Vendedor, Consolidado de Vendas, Material, Visitas, Reclamações, Orçamentos;
- Logística: Entrega/Recolhimento de Pallets, Inventário de Pallets;
- Frota: Abastecimento, Gestão de Veículos, Consumo Diesel;
- Financeiro: Financeiro, Custo de EPI;
- RH: Hora Extra, Quadro de Funcionários, Ativos por Setor, Ativos no Mês;
- Segurança: Segurança, Treinamentos;
- Manutenção: Ordem de Serviço.

O Script usa Google Sheets como persistência e `CacheService` para desempenho. Na migração, os dados/regras são aproveitados; a experiência é redesenhada no padrão SIG.

### Produção — primeira tela em homologação
Campos confirmados no Script:
- Data;
- Produção/Máquina;
- Quantidade produzida;
- Horas trabalhadas;
- Produção por hora;
- Item;
- Concretador.

Indicadores previstos no SIG:
- produção filtrada;
- horas trabalhadas;
- produtividade média;
- número de lançamentos;
- evolução mensal/anual;
- total por recurso/máquina;
- média por hora.

A tela permanece em homologação até aprovação, Rules e merge.

## 10. Dashboard

Dashboard é cockpit de leitura e decisão, nunca nova fonte de lançamentos.

Deve mostrar apenas widgets permitidos pelo perfil e respeitar empresa/período. À medida que módulos do Script forem migrados, seus KPIs-base devem ser disponibilizados no Dashboard.

## 11. Decisões abertas

Ainda não estão aprovadas como arquitetura definitiva:
- banco de dados local em substituição ao Firebase;
- API própria obrigatória;
- acesso somente via VPN;
- domínio customizado/estrutura multi-tenant por URL;
- app Android/iOS nativo.

Direção preferencial para mobile, quando entrar no escopo: PWA primeiro; app nativo apenas quando houver necessidade real de recursos do dispositivo.

## 12. Fonte de verdade

Para comportamento vigente, verificar sempre:
1. `main`;
2. código importado em `app.js`;
3. roteadores ativos;
4. `firestore.rules` efetivamente publicada;
5. documentação desta baseline;
6. CI do HEAD correspondente.

Conversas, memória de IA e PRs não mergeados não substituem a fonte versionada.