# SIG — Guia Operacional de Continuidade

**Data-base:** 16/09/2026  
**Baseline histórica substituída:** 02/09/2026  
**Baseline:** `docs/SIG-BASELINE-ATUAL.md`

## 1. Retomada segura

Antes de desenvolver:
1. confirmar `main` e HEAD;
2. ler a baseline atual;
3. verificar roteador/imports reais;
4. verificar permissões e Rules do módulo;
5. conferir PRs abertos sem tratá-los como produção;
6. atualizar documentação e QA no mesmo pacote.

## 2. Navegação atual

### Comercial
- Vendas & Comissões.

### Controladoria & FP&A
Visualmente agrega:
- Contratos;
- Contas a Pagar;
- Permutas;
- Consórcios;
- módulos nativos da Controladoria.

A organização visual não muda coleções ou namespaces de permissão.

## 3. Release

Para funcionalidade relevante:

`feature branch → CI verde → preview isolado → homologação → ajustes → aprovação → merge → produção`

Não usar `main` como preview. Se não houver preview navegável, configurar a esteira antes de pedir homologação visual.

## 4. Regras por domínio

### Plano/DRE
- Plano v6: `#.##.##.####`;
- somente Analíticas lançam;
- `codigoReduzido` é referência externa opcional;
- DRE Gerencial é primária;
- CPC 51 fica em Outras visualizações;
- totalizadores são calculados.

### Contratos
- conta de planejamento deve ser Analítica de Resultado e ativa;
- CC deve autorizar a conta;
- reajuste compartilhado por Budget/Forecast/AP/Caixa;
- mudança de regra ou renovação recalcula futuro/aberto;
- estados pagos/realizados/fechados devem ser preservados;
- não existe consulta automática de índice econômico externo.

### Contas a Pagar
- cockpit operacional;
- pode ser alimentado por Contratos;
- não alimenta automaticamente DRE/Budget/Forecast/Caixa;
- conta planejada no lançamento e conta efetiva na baixa conforme permissão.

### Correções administrativas
- estorno: Administrador + senha + motivo + auditoria;
- exclusão física: excepcional, mesma proteção, apenas quando seguro;
- histórico real não deve ser apagado.

## 5. Firebase

- Auth + Firestore são a arquitetura vigente;
- GitHub Pages não publica Rules;
- se `firestore.rules` mudar, publicar arquivo completo manualmente/CLI e avisar;
- Storage permanece adiado/não ativo;
- banco local/API/VPN são opções futuras, não estado atual.

## 6. Migração do Script

Regra de trabalho:

`entender tela atual → separar regra/dado de UX → desenhar no padrão SIG → implementar → preview → homologar → fechar Rules/persistência → merge`

O Script não deve ser copiado visualmente. Listas fixas devem virar cadastros quando fizer sentido. KPIs relevantes devem chegar ao Dashboard.

Ordem inicial:
1. Operação · Produção;
2. Operação · Descarte;
3. demais telas conforme homologação e prioridade definida pelo usuário.

## 7. Produção em homologação

PR #30 é a primeira migração funcional. Não considerar Produção ativa até:
- preview navegável;
- aprovação visual/funcional;
- persistência final;
- Rules publicadas quando aplicável;
- merge em `main`.

Campos confirmados: Data, Produção/Máquina, Quantidade, Horas, Produção por hora, Item, Concretador.

## 8. QA mínimo por nova tela

Validar:
- permissão de menu e de ação;
- empresa/grupo;
- cadastro, edição e correção;
- filtros;
- cálculos;
- históricos;
- Dashboard quando aplicável;
- Rules;
- comportamento mobile/PWA;
- ausência de regressão em módulos existentes.

## 9. Decisões que exigem aprovação explícita

Não alterar autonomamente:
- relação entre Contratos, AP, Budget, Forecast e Caixa;
- política de estorno/exclusão;
- estrutura DRE/CPC 51;
- permissões;
- isolamento por empresa/grupo;
- backend Firebase x banco local;
- ativação de Storage;
- arquitetura multi-tenant/domínio;
- estratégia de app nativo.

## 10. Rollback

Em falha:
1. preservar dados;
2. reverter frontend ao SHA estável;
3. reverter Rules somente para versão completa conhecida;
4. publicar frontend e Rules compatíveis;
5. registrar causa e correção.

Código, Rules, QA e documentação devem evoluir juntos.