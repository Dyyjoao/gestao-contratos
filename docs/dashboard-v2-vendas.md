# SIG — Dashboard v2 e Vendas & Comissões

**Atualizado em:** 16/09/2026

## 1. Dashboard

Dashboard é cockpit de leitura e decisão. Não é fonte operacional, ledger ou motor de lançamentos.

Regras:
- widgets respeitam permissões do módulo de origem;
- respeitam empresa e período;
- preferência pessoal fica em `dashboardPreferencias/{uid}`;
- resumo deve permitir abrir o módulo de origem quando houver rota;
- novos módulos relevantes devem expor KPIs-base ao Dashboard.

Com a migração do Script, Dashboard passará a receber gradualmente indicadores de Operação, Comercial, Frota, RH, Segurança e Manutenção conforme cada tela for aprovada.

## 2. Vendas & Comissões

A tela do SIG permanece como tela comercial principal. Não criar uma segunda tela paralela chamada Vendedor ou Consolidado de Vendas apenas para copiar o Script.

Permissões próprias:
- `vendas.visualizar`;
- `vendas.lancar`;
- `vendas.editar`;
- `vendas.vendedores`;
- `vendas.comissoes`.

Coleções:
- `vendedores`;
- `vendas`.

## 3. Navegação

Vendas & Comissões aparece dentro da área **Comercial**.

Contratos/Contas a Pagar/Permutas/Consórcios aparecem dentro de Controladoria & FP&A. Essa mudança não afeta Vendas nem suas permissões.

## 4. Regras de comissão

O vendedor define meta, taxa padrão, base `venda` ou `faturamento` e status.

Cada venda preserva snapshot:
- `baseComissao`;
- `comissaoPct`;
- `comissaoBaseValor`;
- `comissaoValor`;
- `comissaoStatus`.

Alteração posterior no vendedor não deve recalcular silenciosamente histórico.

## 5. Informações do Script a incorporar na revisão da tela

O Script possui informações comerciais que serão avaliadas tela por tela e incorporadas na experiência atual do SIG quando úteis:
- empresa;
- cliente;
- código do cliente;
- cidade;
- vendedor;
- tipo de cliente;
- valor semanal;
- acumulado;
- período/importação;
- materiais e demais informações confirmadas durante a revisão específica.

Esses campos serão adicionados sem remover os recursos já melhores do SIG: venda, faturamento, meta, atingimento, ticket médio, comissão, ranking e performance.

## 6. Segregação por vendedor

O Script possui conceito de vendedor restrito aos próprios registros. No SIG essa segregação deve ser implementada por perfil/permissão e backend, não por lista fixa de e-mails no código.

A regra final será fechada durante a revisão da tela Comercial antes de qualquer alteração de autorização.

## 7. Importação Pangéia

A importação atual continua independente da migração do Script e mantém prévia, conferência, vinculação de vendedores, duplicidades e rastreabilidade.

## 8. Integração contábil

Vendas não gera automaticamente DRE, Balanço, Caixa, Budget ou Forecast. Dashboard pode exibir a leitura comercial sem transformar Vendas em fonte contábil.

Qualquer integração futura exige decisão explícita.

## 9. Dashboard comercial

KPIs atuais permanecem:
- Vendas;
- Faturamento;
- Meta;
- Atingimento;
- Comissão gerada.

Na revisão da tela poderão ser incorporadas outras leituras vindas do Script, desde que façam sentido gerencial e respeitem permissão/empresa/período.