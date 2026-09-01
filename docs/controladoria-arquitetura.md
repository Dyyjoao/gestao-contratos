# Controladoria & FP&A — Arquitetura Modular Vigente

**Baseline:** 01/09/2026.

Este arquivo é um mapa operacional curto. Para regras completas, ler `docs/SIG-DOSSIE-DE-CONTINUIDADE.md` e `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`.

## Rotas atuais

O roteador `js/controllership-router.js` é a fonte de verdade das telas ativas:

- DRE — `ctrl-dre-v6.js`;
- Balanço — `ctrl-balance-sheet-v1.js`;
- Input Mensal — `ctrl-input-v6.js`;
- Budget — `ctrl-budget-v7.js`;
- Forecast — `ctrl-forecast-v5.js`;
- Fluxo de Caixa — `cashflow.js` sob demanda;
- Prestação — `accountability.js` sob demanda;
- Fechamento — `closing-v3.js`;
- Permutas — `permutas.js`;
- Premissas — `ctrl-premises-v4.js`;
- Imobilizado/CAPEX — `ctrl-assets-v1.js`;
- Plano de Contas — `ctrl-chart-accounts-v5.js`;
- Centros de Custo — `ctrl-cost-centers-v2.js`;
- Configurações — `ctrl-settings.js`.

Arquivos antigos podem permanecer no repositório, mas não devem ser considerados ativos sem rota/import atual.

## Carregamento

- módulos pesados são carregados sob demanda;
- telas de consulta evitam recarregar base a cada alteração pequena de contexto;
- DRE/Balanço podem consolidar empresas;
- Input, Fluxo de Caixa, Prestação e Imobilizado exigem empresa única conforme sua função;
- Budget/Forecast compartilham motor de planejamento;
- Dashboard/Prestação usam o núcleo comum `financial-reporting.js` para interpretação financeira;
- Budget e Forecast têm teste de abertura real no browser, não apenas teste de importação.

### Shell compartilhado de Caixa e Prestação

Fluxo de Caixa e Prestação ainda usam o mesmo contêiner visual `pagina-controladoria`, mas o roteador cria apenas um **shell mínimo de abas internas** para essas duas telas.

O caminho ativo **não importa mais**:

- `fpa.js`;
- `fpa-number-fix.js`;
- `planning-details.js`.

Esses arquivos podem permanecer fisicamente no histórico do repositório, porém abrir Caixa ou Prestação não deve montar DRE/Budget/Forecast/Plano antigos nem disparar consultas ocultas dessas bases.

O alias `SIG_ABRIR_CTRL_LEGADO` redireciona para as ações atuais do roteador e não deve reativar telas antigas.

## Plano de Contas

Máscara fixa:

```text
#          raiz
#.##       Sintética
#.##.####  Analítica
```

Raízes:

```text
1 Ativo
2 Passivo
3 Receita
4 Despesa
9 Estatística
```

Sintética nunca recebe lançamento. Analítica é folha lançável.

Inativação verifica uso futuro em Realizado, Budget, Forecast, detalhes, premissas e Imobilizado. Se a coleção `imobilizados` não puder ser validada, a inativação é bloqueada.

## Natureza

`js/account-mask.js` centraliza natureza contábil e multiplicadores.

- apresentação nunca regrava saldo bruto;
- redutora = natureza oposta à raiz;
- Balanço/Estatística não compõem Resultado;
- DRE/Dashboard/Prestação não devem inventar regra própria de sinal.

## Centros técnicos

```text
__cc_estatistico__
__cc_balanco__
```

Não aparecem como Centros operacionais normais.

## Balanço

- posição de fechamento;
- meses não são somados;
- consolidação multiempresa por código;
- Imobilizado pode alimentar contas automaticamente;
- diferença Ativo − Passivo/PL fica explícita;
- falha de leitura de `imobilizados` bloqueia a integração automática em vez de assumir posição zero.

## Budget / Forecast / Premissas

- Budget anual e versionado;
- Forecast = Realizado fechado + futuro;
- premissas respeitam vigência mês a mês;
- depreciação automática do Imobilizado substitui projeção manual equivalente;
- falha de `imobilizados` bloqueia o cálculo automático de depreciação em vez de ser convertida em zero.

## Imobilizado & CAPEX

Coleção persistente: `imobilizados`.

A coleção é usada por:

- ficha de Imobilizado/CAPEX;
- Balanço;
- Input patrimonial;
- Budget;
- Forecast;
- DRE projetada;
- proteção de inativação do Plano de Contas.

Ela é uma dependência crítica. O núcleo de dados registra erro de coleção, e integrações contábeis devem operar em modo **fail-closed**.

## Contexto monoempresa

Fluxo de Caixa e Prestação devem bloquear imediatamente se o contexto mudar para várias empresas enquanto a tela estiver aberta.

Imobilizado e lançamentos de planejamento também exigem identidade empresarial inequívoca.

## Segurança e deploy

Qualquer nova coleção/padrão de escrita exige revisão de `firestore.rules`.

A configuração de deploy do Firebase está em:

- `.firebaserc`;
- `firebase.json`;
- `firestore.rules`;
- `storage.rules`.

**GitHub Pages publica somente o frontend.** Alteração de Rules exige deploy Firebase separado e teste autenticado.

A política completa está em `SECURITY.md` e `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`.
