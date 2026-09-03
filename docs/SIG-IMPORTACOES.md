# SIG — Arquitetura de Importações

## Objetivo

O SIG deve evoluir para aceitar alimentação por importação em vários módulos sem criar um importador diferente e inconsistente para cada tela.

O padrão obrigatório é:

**arquivo → leitura local → parser do módulo → prévia → validações → duplicidades → conferência de totais → gravação → rastreabilidade**.

O arquivo bruto não deve ser enviado ao Firebase quando não houver necessidade funcional. O navegador deve interpretar o arquivo localmente e gravar somente os registros estruturados validados.

## Núcleo reutilizável

Arquivo: `js/import-center.js`.

Responsabilidades:

- leitura de arquivos texto com detecção prática de UTF-8 e Windows-1252;
- normalização de caracteres e chaves externas;
- conversão de números brasileiros;
- conversão de datas brasileiras para ISO;
- geração de chaves determinísticas para detecção de reimportação;
- execução controlada em lotes.

O núcleo não deve conhecer regras de Vendas, Controladoria, Estoque ou qualquer outro módulo.

Cada módulo cria seu próprio adaptador/parser e reaproveita o núcleo.

## Primeiro adaptador — Vendas / Pangéia

Arquivo: `js/sales-pangeia-import.js`.

Fonte atualmente suportada:

- relatório TXT **Comissão por Vendedor** do Pangéia/Pangéia Lite;
- alternativa de copiar e colar o conteúdo textual do relatório.

Campos reconhecidos:

- código/nome do vendedor no relatório;
- percentual de comissão do vendedor;
- número da venda;
- cliente;
- data;
- C.I.;
- valor líquido;
- comissão informada no relatório;
- total líquido por vendedor;
- total de comissão por vendedor quando disponível.

O parser deve tolerar registros quebrados em mais de uma linha, inclusive C.I. que aparece na linha seguinte à data.

## Conferência antes da gravação

A importação de Vendas deve sempre mostrar:

- empresa encontrada no relatório e empresa de destino selecionada no SIG;
- quantidade de vendedores;
- quantidade de vendas reconhecidas;
- quantidade de duplicidades;
- total líquido lido;
- total de comissão informado;
- conferência por vendedor;
- prévia das linhas antes da gravação.

Diferenças de poucos centavos entre a soma das linhas e o `Total do Vendedor` não devem ser corrigidas silenciosamente. A divergência deve ser mostrada para auditoria, pois pode decorrer do critério de arredondamento do sistema de origem.

## Vendedores

Na primeira importação, cada vendedor do arquivo deve ser:

1. reconhecido automaticamente quando houver correspondência segura; ou
2. vinculado manualmente a um vendedor existente; ou
3. cadastrado durante a importação por usuário com permissão de gestão de vendedores.

Para vendedor novo, a base da comissão deve ser informada como:

- Venda; ou
- Faturamento.

O percentual encontrado no relatório é preservado em cada venda como informação da fonte.

## Venda x Faturamento

O relatório `Comissão por Vendedor` representa uma operação que já gerou comissão.

Assim:

- vendedor com comissão por **Venda**: `Líquido` é usado como valor da venda;
- vendedor com comissão por **Faturamento**: `Líquido` é usado como valor faturado e a data da linha é usada como data de faturamento, pois são as únicas informações de base disponíveis nesse relatório.

Essa decisão deve ser revista se uma futura fonte do Pangéia disponibilizar separadamente venda, faturamento e datas de cada evento.

## Comissão e arredondamento

O SIG mantém:

- `comissaoPct` — percentual aplicado;
- `comissaoBaseValor` — base usada pelo SIG;
- `comissaoValor` — cálculo interno;
- `percentualRelatorio` — percentual informado na fonte;
- `comissaoRelatorio` — comissão impressa no relatório;
- `comissaoDiferenca` — diferença entre cálculo interno e fonte;
- `vendedorOrigem` — identificação do vendedor na fonte.

O valor exibido em moeda pode coincidir com o relatório mesmo quando o cálculo interno mantém mais casas decimais.

## Duplicidades e reprocessamento

Cada venda importada recebe:

- `origemImportacao: "pangeia_comissao"`;
- `arquivoImportacao`;
- `importacaoChave`;
- número da venda em `documento`;
- C.I. em campo próprio e observação.

A chave atual considera fonte + empresa + número da venda.

Uma linha também é considerada duplicada quando já existe venda da mesma empresa com o mesmo número em `documento`.

A importação é reiniciável: se houver falha parcial, uma nova análise deve reconhecer como duplicadas as linhas já gravadas.

## Segurança e permissões

A importação de Vendas utiliza a permissão existente **Vendas → Registrar vendas**.

- sem essa permissão, o botão de importação fica indisponível;
- criação de vendedor durante a importação exige **Gerir vendedores, metas e regras**;
- quando o percentual do relatório divergir do cadastro, um usuário sem permissão **Comissões** não pode substituir silenciosamente a taxa do vendedor;
- as Firestore Rules existentes continuam validando empresa/grupo, vendedor válido, cálculo e comissão.

Nesta versão não é necessária nova publicação de Firestore Rules porque os registros importados seguem o mesmo contrato de criação das vendas manuais.

## Diretriz para novos importadores

Futuros módulos devem evitar leitura e gravação direta sem prévia.

Ao criar um novo adaptador:

1. reutilizar `js/import-center.js`;
2. manter parser específico fora do núcleo;
3. definir chave de duplicidade estável;
4. preservar a identificação da fonte;
5. exibir totais e erros antes da gravação;
6. respeitar o escopo de grupo/empresa;
7. usar as permissões do módulo;
8. revisar Firestore Rules quando o importador introduzir nova coleção ou novo poder de escrita;
9. incluir QA automatizado do parser e smoke da tela;
10. atualizar esta documentação e os documentos de continuidade quando a arquitetura mudar.

## Candidatos futuros

A mesma arquitetura pode ser aplicada, conforme prioridade operacional, a:

- Realizado/Controladoria;
- Inadimplência;
- Imobilizado;
- Consórcios;
- Estoque/Almoxarifado;
- Contratos;
- Prestadores;
- outros módulos com fonte estruturada confiável.

A existência da infraestrutura de importação não autoriza integração automática entre módulos. Cada fonte deve continuar preservando a separação entre dado operacional, financeiro e contábil.
