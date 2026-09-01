# SIG — Sistema Integrado de Gestão

WebApp/PWA empresarial com frontend modular em JavaScript e backend gerenciado por Firebase Authentication + Cloud Firestore.

**Baseline documental atual:** 01/09/2026 — Plano de Contas v6 + Balanço gerencial + Consórcios v1.

## Escopo ativo

- Dashboard gerencial;
- Minha Mesa;
- Contratos;
- Controladoria & FP&A;
- Governança & Compliance;
- Administração.

Módulos antigos podem continuar no repositório por histórico/compatibilidade, mas não são considerados ativos sem rota explícita.

## Plano de Contas vigente

Módulo ativo: `js/ctrl-chart-accounts-v6.js`.

Máscara:

`#.##.##.####`

Hierarquia:

`Raiz → Sintética N1 (#.##) → Sintética N2 (#.##.##) → Analítica (#.##.##.####)`.

Exemplo:

`1 → 1.01 Ativo Circulante → 1.01.01 Disponibilidades → 1.01.01.0001 Caixa`.

O Plano v6 possui árvore expansível, filtro Ativas/Inativas/Todas, inativação por exercício, reativação e exclusão segura de cadastros sem histórico.

## Documentação oficial

Leia nesta ordem:

1. `AGENTS.md` — contrato para agentes/desenvolvedores;
2. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md` — estado funcional e arquitetural completo;
3. `docs/SIG-MANUAL-MESTRE.md` — invariantes;
4. `docs/SIG-GUIA-DE-CONTINUIDADE.md` — retomada, release e rollback;
5. `docs/SIG-FIREBASE-DEPLOY-E-RULES.md` — backend, Rules e deploy;
6. `SECURITY.md` — segurança;
7. `docs/controladoria-arquitetura.md` — mapa modular;
8. `docs/qa-controladoria-modular.md` — QA;
9. `docs/release-controladoria-modular.md` — promoção.

## Arquitetura de Controladoria

A fonte de verdade das rotas é `js/controllership-router.js`.

Módulos atuais incluem DRE v6, Balanço v1, Input v6, Budget v7, Forecast v5, Plano v6, Premissas v4, Imobilizado v1, **Consórcios v1**, Centros v2, Fechamento v3, Caixa e Prestação.

Natureza contábil, raízes, máscara e multiplicadores são centralizados em `js/account-mask.js`.

### Consórcios v1

- tela: `js/ctrl-consorcios-v1.js`;
- cálculos: `js/consortium-calculations.js`;
- coleção: `consorcios`;
- permissões: `consorciosVisualizar` e `consorciosEditar`;
- gestão de ativos, contemplados, encerrados e cancelados;
- carta contratada/atual, parcelas, taxas, encargos, contemplação e saldo teórico;
- consulta pode consolidar empresas selecionadas; novo cadastro exige uma empresa;
- nesta versão não alimenta DRE, Balanço, Caixa, Budget, Forecast ou Imobilizado.

## Firebase

GitHub Pages publica somente o frontend. `firestore.rules` e `storage.rules` precisam ser publicadas separadamente no Firebase quando alteradas.

A baseline atual contém Rule de `imobilizados`, delete seguro de `planoContasGerencial` e autorização própria da coleção `consorcios`.

Projeto configurado em `.firebaserc`: `gestao-de-contratos-b266b`.

## QA

Workflows principais:

- `SIG Quality Check`;
- `SIG Firebase Contract Check`;
- `SIG Permissions Contract Check`;
- `SIG Consorcios Contract Check`;
- Pages build/deployment.

Mudanças estruturais só devem chegar à `main` depois do HEAD final verde.

## Regra de dados

- Sintética nunca recebe lançamento;
- Analítica é folha lançável;
- saldo bruto persistido não é regravado para ajustar apresentação;
- conta com histórico deve ser inativada, não apagada;
- exclusão física do Plano serve apenas para cadastro de teste/erro sem referências;
- ficha de Consórcio é encerrada/cancelada e não apagada na v1;
- base contábil crítica indisponível deve falhar de forma fechada;
- módulo independente não passa a gerar lançamento automático sem decisão arquitetural explícita.