# SIG — Manual Mestre de Arquitetura e Regras

> Documento de invariantes do Sistema Integrado de Gestão.  
> **Atualizado em:** 16/09/2026.  
> A baseline consolidada está em `docs/SIG-BASELINE-ATUAL.md`.

## 1. Fonte de verdade

A lógica vigente deve existir em código, Rules/configuração versionada, documentação e QA. Conversa ou memória não substituem essas fontes.

Em caso de divergência:
1. código mergeado em `main`;
2. Rules efetivamente publicadas;
3. `docs/SIG-BASELINE-ATUAL.md`;
4. documentos específicos do módulo.

## 2. Segurança e escopo

- autenticação não é autorização;
- Grupo e Empresa são fronteiras de segurança;
- update não pode trocar `grupoId`/`empresaId` para escapar do escopo;
- tela monoempresa exige uma empresa inequívoca;
- Rules são a barreira efetiva, UI é proteção adicional;
- GitHub Pages não publica Rules;
- `firestore.rules` e `storage.rules` são independentes;
- Storage permanece adiado/não ativo para a operação atual.

## 3. Release e homologação

Fluxo padrão:

`feature branch → CI verde → preview isolado → homologação → ajustes → aprovação → merge main → produção`

Não promover funcionalidade relevante para `main` apenas para permitir teste visual. A esteira de preview deve ser configurada para os próximos módulos da migração.

## 4. Navegação por áreas

A navegação atual agrupa visualmente módulos por área.

### Comercial
- Vendas & Comissões

### Controladoria & FP&A
Além dos módulos nativos, agrupa visualmente:
- Contratos;
- Contas a Pagar;
- Permutas;
- Consórcios.

**Invariante:** essa organização não altera o módulo de permissão nem a coleção de cada item. Não migrar permissões próprias para `controladoria.*` sem decisão explícita.

### Operação
Será incorporada tela por tela a partir do sistema Script. Produção é a primeira tela em homologação e não integra a baseline produtiva até aprovação/Rules/merge.

## 5. Plano de Contas v6

Máscara: `#.##.##.####`.

Hierarquia:
- raiz `1/2/3/4/9`;
- Sintética N1;
- Sintética N2;
- Analítica.

Somente Analíticas são lançáveis.

Raízes:
- 1 Ativo;
- 2 Passivo;
- 3 Receita;
- 4 Despesa;
- 9 Estatística.

`js/account-mask.js` é a fonte de raiz, natureza, redutora e multiplicadores.

`codigoReduzido` é referência externa opcional do Pangéia. Nunca dirige hierarquia, DRE, Balanço, consolidação ou cálculo.

Conta com vida real deve ser inativada. Exclusão física é somente correção excepcional de teste/erro sem dependências e segue a política administrativa auditável.

## 6. DRE e classificação

A arquitetura aprovada e vigente é:
- DRE Gerencial como visão principal;
- `Detalhar contas`;
- `Estrutura do plano`;
- `Outras visualizações`;
- `DRE Societária · CPC 51`.

Cada conta analítica de resultado pode carregar Tipo, Natureza, Linha DRE Gerencial e Categoria CPC 51. A mesma conta alimenta Realizado, Budget e Forecast. Totalizadores como Margem de Contribuição e EBITDA são calculados e não viram contas lançáveis.

## 7. Budget, Forecast e Premissas

- Budget é anual/versionado;
- Forecast preserva Realizado fechado e projeta o futuro;
- Premissas respeitam competência/vigência;
- Centro de Custo limita as contas permitidas;
- conta nova só aparece no planejamento do CC depois de autorizada.

## 8. Contratos como drivers

Contratos podem dirigir planejamento, Contas a Pagar e Caixa conforme suas flags.

Campos centrais:
- `planejamentoAtivo`;
- `fluxoCaixaAtivo`;
- `contaGerencialId`;
- `centroCustoId`;
- `diaVencimento`;
- `regraReajuste`;
- `comentarioPlanejamento`.

A conta deve ser Analítica de Resultado, ativa no exercício e autorizada no CC quando houver planejamento.

Reajuste é calculado por motor compartilhado. Edição de percentual, referência, vigência, renovação ou parâmetros relevantes deve reconciliar apenas posições futuras/abertas e respeitar estados pagos/realizados/fechados. O SIG não busca índice econômico externo automaticamente.

## 9. Contas a Pagar

É cockpit operacional, não razão contábil nem módulo FP&A.

- pode receber obrigações de Contratos;
- não alimenta DRE/Budget/Forecast/Caixa automaticamente;
- conta bancária planejada nasce no compromisso;
- pagamento registra conta efetiva conforme permissão;
- filtros/relatórios respeitam conta;
- itens pagos/estornados não são sobrescritos por sincronização;
- obrigação histórica em aberto não é cancelada só por ficar fora da janela corrente.

## 10. Correções administrativas

Todo módulo com input persistente deve permitir correção auditável.

Estorno normal:
- Administrador;
- reautenticação com senha atual;
- motivo obrigatório;
- histórico preservado;
- quem/quando/por quê;
- neutralização do efeito ativo.

Exclusão física:
- excepcional;
- Administrador;
- senha + aviso + motivo + auditoria;
- somente teste/duplicidade/dado seguro;
- evitar quando houver dependências.

`auditoriaAdministrativa` é append-only.

## 11. Dashboard

Dashboard é consumidor de dados e cockpit de decisão. Não grava lançamentos de origem. Widgets dependem das permissões do módulo e respeitam empresa/período.

Todo módulo relevante migrado do Script deve expor KPIs-base ao Dashboard.

## 12. Migração Script → SIG

O Script é fonte de requisitos/regras/dados. O SIG é referência de UX.

Inventário atual:
- Operação: Produção, Descarte;
- Comercial: Vendedor, Consolidado de Vendas, Material, Visitas, Reclamações, Orçamentos;
- Logística: Entrega/Recolhimento de Pallets, Inventário de Pallets;
- Frota: Abastecimento, Gestão de Veículos, Consumo Diesel;
- Financeiro: Financeiro, Custo de EPI;
- RH: Hora Extra, Quadro de Funcionários, Ativos por Setor, Ativos no Mês;
- Segurança: Segurança, Treinamentos;
- Manutenção: Ordem de Serviço.

A migração é tela por tela. Não criar integração nova apenas porque existe ou parece conveniente; qualquer mudança de regra/arquitetura precisa de aprovação explícita.

## 13. Arquitetura futura — não aprovada

Continuam apenas como opções em avaliação:
- banco local/API própria;
- VPN obrigatória;
- domínio customizado multi-tenant;
- aplicativo nativo.

Até decisão explícita, Firebase continua sendo a arquitetura produtiva.