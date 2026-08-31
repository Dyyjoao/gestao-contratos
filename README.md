# SIG — Sistema Integrado de Gestão

WebApp/PWA empresarial com frontend modular em JavaScript e backend gerenciado por Firebase Authentication + Cloud Firestore.

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
5. `SECURITY.md` — política de segurança;
6. `docs/qa-controladoria-modular.md` — QA funcional/contábil;
7. `docs/release-controladoria-modular.md` — checklist de promoção.

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

## Arquitetura

- `index.html` + `app.js`;
- ES Modules em `js/`;
- carregamento sob demanda para módulos pesados;
- Firebase Authentication;
- Cloud Firestore;
- `firestore.rules` como barreira real de dados;
- GitHub Pages como hospedagem atual do frontend.

Frontend e banco são independentes: trocar de host/domínio não apaga o Firestore se o mesmo projeto Firebase continuar sendo usado.

## Segurança

`SECURITY.md` é obrigatório para qualquer alteração de autenticação, permissões, persistência, domínio ou armazenamento.

Nunca colocar Service Account, chave privada, token administrativo ou outro segredo no frontend/repositório.

## Qualidade

GitHub Actions executa o `SIG Quality Check`, incluindo validações de sintaxe, contratos arquiteturais e smoke/import dos módulos da Controladoria.

Mudança estrutural só é considerada completa quando código, QA, Rules quando aplicável e documentação estão coerentes.