# SIG — QA da Controladoria e Migração

**Atualizado em:** 16/09/2026

## Política

Nenhuma funcionalidade relevante deve ser promovida sem:

`CI verde → preview isolado → homologação → aprovação → merge`

## Navegação

Validar:
- Comercial contém Vendas & Comissões;
- Controladoria contém visualmente Contratos, Contas a Pagar, Permutas e Consórcios antes dos módulos nativos;
- raízes antigas desses módulos não ficam duplicadas visivelmente;
- permissões próprias continuam sendo respeitadas.

## Controladoria

Validar:
- DRE Gerencial como principal;
- Detalhar contas;
- Estrutura do plano;
- DRE Societária CPC 51 em Outras visualizações;
- totalizadores calculados;
- Plano v6 e `codigoReduzido` sem efeito estrutural;
- contas analíticas novas só aparecem no CC após autorização.

## Contratos

Validar:
- somente conta analítica de resultado ativa;
- conta autorizada pelo CC quando planejamento estiver ativo;
- edição de reajuste/renovação reconcilia futuro/aberto;
- histórico fechado/realizado/pago não é sobrescrito;
- AP usa valor reajustado;
- não há busca automática externa de índice.

## Contas a Pagar

Validar:
- cockpit semanal;
- conta bancária planejada no lançamento;
- conta efetiva na baixa;
- filtro/impressão por conta;
- contrato gera/atualiza futuro;
- pago/estornado preservado;
- obrigação histórica aberta não é cancelada por janela;
- nenhuma integração automática com DRE/Budget/Forecast/Caixa.

## Produção — PR #30

Antes do merge, validar em preview:
- menu Operação → Produção;
- formulário Data/Máquina/Quantidade/Horas/Item/Concretador;
- Produção por hora automática;
- regras de item por recurso;
- cadastros;
- filtros;
- KPIs;
- gráficos;
- histórico;
- estorno ADM;
- comportamento mobile;
- permissões;
- Rules publicadas somente depois da aprovação final.

## Firebase

- Rules correspondem ao HEAD aprovado;
- perfil autorizado acessa;
- perfil não autorizado é bloqueado;
- Pages e Rules são verificados separadamente;
- Storage não deve ser tratado como ativo.

## Regressão

Toda tela nova deve garantir que módulos existentes continuem abrindo e seus workflows permaneçam verdes.