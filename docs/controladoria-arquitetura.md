# Controladoria & FP&A — arquitetura modular

A Controladoria deixa de ser uma tela monolítica e passa a ser acessada por submenu expansível.

## Regra de carregamento

- DRE Gerencial: tela isolada; consulta somente ao abrir ou clicar em Atualizar.
- Input Mensal: tela isolada; uma empresa e um mês por lançamento.
- Fluxo de Caixa: importação sob demanda.
- Prestação de Contas: importação sob demanda.
- Fechamento: importação sob demanda.
- Permutas: tela isolada; consulta somente ao abrir ou clicar em Atualizar.
- Configurações: tela isolada e restrita a administrador/edição da Controladoria.
- Budget, Forecast, Plano de Contas, Centros de Custo e Premissas: permanecem temporariamente no núcleo FP&A compartilhado, porém esse núcleo só é importado quando uma dessas telas é acessada.

## Contexto global

O cabeçalho continua definindo grupo, empresas, exercício e período. Telas pesadas não consultam o Firestore automaticamente quando o período muda: elas marcam o contexto como alterado e aguardam Atualizar.

## Permutas

Coleções:
- `permutas`: cadastro do acordo/conta-corrente.
- `permutaMovimentos`: razão da permuta.

Saldo contratual = créditos gerados por entregas - consumos/recebimentos.

Resultado econômico = valor de mercado recebido - custo interno do que foi entregue.

Permutas entre empresas do grupo criam cadastros e movimentos espelhados vinculados por identificadores comuns.
