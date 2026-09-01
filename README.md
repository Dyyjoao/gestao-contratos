# SIG — Sistema Integrado de Gestão

WebApp/PWA empresarial com frontend modular em JavaScript e backend gerenciado por Firebase Authentication + Cloud Firestore.

**Baseline documental atual:** 01/09/2026.

## Escopo ativo

- Dashboard gerencial;
- Minha Mesa;
- Contratos;
- Controladoria & FP&A;
- Governança & Compliance;
- Administração.

Módulos antigos podem continuar no repositório por histórico/compatibilidade, mas não são considerados ativos sem rota explícita.

## Documentação oficial

Leia nesta ordem:

1. `AGENTS.md` — contrato para agentes/desenvolvedores;
2. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md` — estado funcional e arquitetural completo;
3. `docs/SIG-MANUAL-MESTRE.md` — invariantes que não podem ser quebradas;
4. `docs/SIG-GUIA-DE-CONTINUIDADE.md` — retomada, release e rollback;
5. `docs/SIG-FIREBASE-DEPLOY-E-RULES.md` — contrato de backend, deploy e diagnóstico de Rules;
6. `SECURITY.md` — política de segurança;
7. `docs/qa-controladoria-modular.md` — QA funcional/contábil;
8. `docs/release-controladoria-modular.md` — checklist de promoção.

Não existem documentos obrigatórios ocultos fora dessa lista.

## Controladoria & FP&A

A rota ativa é definida em `js/controllership-router.js`.

Núcleo atual inclui:

- DRE Gerencial;
- Balanço Patrimonial;
- Input Mensal;
- Budget;
- Forecast;
- Fluxo de Caixa;
- Prestação de Contas;
- Fechamento;
- Premissas;
- Imobilizado & CAPEX;
- Plano de Contas;
- Centros de Custo;
- Configurações.

O Plano vigente usa máscara fixa:

```text
1 Ativo
2 Passivo
3 Receita
4 Despesa
9 Estatística

#.##       Sintética
#.##.####  Analítica
```

Natureza e multiplicadores são centralizados em `js/account-mask.js`. Multiplicadores nunca regravam saldo bruto.

`js/financial-reporting.js` centraliza a interpretação financeira compartilhada por relatórios gerenciais.

A coleção `imobilizados` é dependência crítica das integrações patrimoniais e de depreciação. Erro de leitura dessa coleção não pode ser tratado como “nenhum bem cadastrado”; cálculos e ações dependentes devem falhar de forma fechada.

## Arquitetura

- `index.html` + `app.js`;
- ES Modules em `js/`;
- carregamento sob demanda para módulos pesados;
- Firebase Authentication;
- Cloud Firestore;
- Firebase Storage;
- `firestore.rules` e `storage.rules` como barreiras reais de dados/arquivos;
- `.firebaserc` + `firebase.json` como contrato de deploy Firebase;
- GitHub Pages como hospedagem atual do frontend.

Frontend e banco são independentes: trocar de host/domínio não apaga o Firestore se o mesmo projeto Firebase continuar sendo usado.

**Importante:** GitHub Pages publica HTML/CSS/JavaScript, mas não publica Firestore/Storage Rules. Se uma versão alterar Rules, o deploy Firebase é uma etapa separada e obrigatória antes de considerar a release concluída.

## Segurança

`SECURITY.md` é obrigatório para qualquer alteração de autenticação, permissões, persistência, domínio ou armazenamento.

Nunca colocar Service Account, chave privada, token administrativo ou outro segredo no frontend/repositório.

## Qualidade

GitHub Actions executa o `SIG Quality Check`, incluindo validações de sintaxe, contratos arquiteturais e browser smoke dos módulos da Controladoria.

Há também contrato específico de Firebase para garantir presença de configuração, Rules do Imobilizado e travas fail-closed das dependências críticas.

Mudança estrutural só é considerada completa quando código, QA, Rules aplicáveis, **deploy das Rules quando necessário** e documentação estão coerentes.
