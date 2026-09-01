# SIG — Manual Mestre de Arquitetura e Regras

> Documento de invariantes do Sistema Integrado de Gestão (SIG).  
> Atualizado em: 01/09/2026.

Este Manual não tenta listar cada detalhe de implementação. O estado funcional completo está em `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`. Aqui ficam as regras que uma evolução não pode quebrar silenciosamente.

---

## 1. Princípio central

A lógica do SIG deve existir em fontes versionadas:

1. código-fonte;
2. `firestore.rules` / `storage.rules`;
3. `firebase.json` / `.firebaserc` para contrato de deploy Firebase;
4. `SECURITY.md`;
5. documentação em `/docs`;
6. QA automatizado.

Conversa e memória de IA são apoio, não fonte única de verdade.

Quando código e documentação divergirem, investigar o comportamento atual, corrigir a divergência e atualizar ambos na mesma entrega.

---

## 2. Filosofia do produto

O SIG trabalha em cinco camadas:

- **Operação:** fontes de eventos/compromissos;
- **Gestão:** Controladoria & FP&A;
- **Controle:** Governança & Compliance;
- **Execução:** Minha Mesa e planos de ação;
- **Direção:** Dashboard, Prestação de Contas e futuros pacotes executivos.

Escopo ativo deve ser confirmado no código. Módulo antigo existente no repositório não é automaticamente parte do produto.

---

## 3. Arquitetura técnica

- frontend estático HTML/CSS/JavaScript ES Modules;
- módulos em `/js`;
- PWA;
- Firebase Authentication;
- Cloud Firestore;
- Firebase Storage;
- regras de segurança em `firestore.rules` e `storage.rules`;
- contrato de destino Firebase em `.firebaserc` + `firebase.json`;
- hospedagem do frontend independente do banco.

Trocar de host ou domínio não deve exigir zerar/migrar o Firestore quando o mesmo projeto Firebase continuar sendo usado.

**GitHub Pages não publica Firestore/Storage Rules.** Frontend e Rules possuem ciclos de deploy independentes. Se uma release mudar Rules, a promoção à `main` não encerra a release por si só.

---

## 4. Contexto global e multiempresa

O cabeçalho define Grupo, Empresa(s), Exercício e Período.

Regras:

- relatórios podem aceitar várias empresas;
- telas de lançamento devem exigir uma única empresa quando a identidade do documento pertence a uma empresa;
- nenhuma tela pode escolher silenciosamente a primeira empresa de um contexto múltiplo;
- mudança de contexto em tela aberta deve invalidar/recarregar/bloquear a visão conforme o módulo.

Input Mensal, Fluxo de Caixa, Prestação de Contas, Imobilizado e edição de Budget/Forecast são monoempresa.

---

## 5. Segurança

A segurança real está em `firestore.rules` e `storage.rules`, não na interface.

Nunca:

- depender de botão oculto;
- expor segredo administrativo no navegador/repositório;
- permitir troca silenciosa de `grupoId`/`empresaId` para escapar de escopo;
- publicar nova coleção ou padrão de escrita sem revisar Rules;
- assumir que uma Rule versionada no Git já está publicada no Firebase.

Toda coleção nova deve nascer no mesmo pacote que sua Rule, QA, documentação e procedimento de deploy.

A política detalhada está em `SECURITY.md` e `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`.

---

## 6. Plano de Contas

Máscara vigente:

```text
1 Ativo
2 Passivo
3 Receita
4 Despesa
9 Estatística

#.##       Sintética
#.##.####  Analítica
```

Regras:

- raiz é estrutural;
- Sintética agrupa e nunca recebe lançamento;
- Analítica é folha lançável;
- não criar níveis Sintéticos arbitrários fora da máscara;
- não reutilizar código automaticamente;
- preservar legado até migração controlada;
- vigência por exercício não apaga histórico;
- inativação deve checar Realizado, Budget, Forecast, detalhes, premissas e Imobilizado;
- se uma base necessária para checar uso estiver indisponível, a inativação deve ser bloqueada.

---

## 7. Natureza contábil

A regra central pertence a `js/account-mask.js`.

Padrões:

| Raiz | Natureza | Apresentação | Resultado |
|---|---|---:|---:|
| Ativo | Devedora | +1 | 0 |
| Passivo | Credora | +1 | 0 |
| Receita | Credora | +1 | +1 |
| Despesa | Devedora | +1 | -1 |
| Estatística | Neutra | informativa | 0 |

Conta redutora usa natureza oposta à raiz.

**Invariante absoluta:** multiplicador de apresentação/resultado nunca altera o saldo bruto armazenado.

Não usar `(-)` no nome como fonte de verdade da redução.

---

## 8. Centros técnicos

Reservados:

```text
__cc_estatistico__
__cc_balanco__
```

Eles não são Centros de Custo operacionais.

- Estatística usa o primeiro;
- Balanço usa o segundo.

---

## 9. Input Mensal

- uma empresa;
- uma competência mensal;
- Sintética bloqueada;
- Analítica financeira depende da matriz CC × Conta;
- Estatística Manual pode ser digitada;
- Estatística Automática/Calculada é bloqueada;
- Balanço recebe saldo bruto de fechamento;
- fechamento impede alteração;
- documento canônico prevalece;
- duplicidade nunca é somada silenciosamente.

Conta patrimonial automática do Imobilizado fica bloqueada para edição manual e deve sinalizar qualquer saldo manual antigo ignorado.

Se `imobilizados` estiver indisponível, o SIG não pode concluir que a conta voltou a ser manual. A integração automática deve falhar de forma fechada.

---

## 10. Balanço Patrimonial

Balanço é posição de fechamento.

- meses não são somados para formar saldo;
- Ativo/Passivo usam natureza/multiplicador central;
- redutoras reduzem subtotais;
- multiempresa consolida por código contábil;
- diferença Ativo − Passivo/PL deve ficar visível;
- divergência de natureza do mesmo código entre empresas deve ser tratada como inconsistência;
- Imobilizado pode alimentar automaticamente as contas mapeadas;
- falha de leitura do Imobilizado bloqueia a visão automática; nunca assumir posição zero.

---

## 11. Budget, Forecast e Premissas

### Budget

- anual;
- exercício vem do cabeçalho;
- ciclo: `NÃO ABERTO → EM ELABORAÇÃO → FINALIZADO`;
- versões preservam histórico;
- A-1 é o exercício anterior ao selecionado;
- linha Analítica principal é calculada pelas sublinhas/memórias;
- Sintética soma descendentes;
- abertura da tela deve ser validada por teste funcional de browser, não só importação do módulo.

### Forecast

```text
FY Forecast = Realizado fechado + projeção futura
```

Mês fechado não pode ser sobrescrito pelo Forecast.

### Premissas

- específica do CC vence corporativa;
- vigência é respeitada mês a mês;
- premissa ativa controla apenas competências dentro de sua vigência;
- sublinha de premissa deve manter origem identificável.

### Depreciação automática

- Budget usa projeção automática da vida útil;
- Forecast mantém Realizado em meses fechados e automação nos meses futuros;
- mesma Conta × CC automática substitui, e não soma, projeção manual;
- se `imobilizados` não puder ser carregado, Budget/Forecast não podem tratar a depreciação como zero.

---

## 12. Estatísticas

- raiz 9;
- natureza neutra;
- fora do resultado financeiro;
- modos Manual e Automático;
- conta legada sem modo explícito é Manual por compatibilidade;
- consolidação precisa declarar Soma/Média/Último/Recalcular;
- percentuais/índices não são somados indiscriminadamente.

---

## 13. Imobilizado & CAPEX

CAPEX é investimento, não OPEX.

Coleção persistente: `imobilizados`.

A DRE recebe depreciação/amortização quando configurada; o Balanço recebe ativo bruto e depreciação acumulada quando integrado.

Regras:

- não depreciar antes da data disponível para uso;
- Depreciação Acumulada deve ser redutora do Ativo;
- conta de despesa deve ser compatível com resultado;
- automação de depreciação substitui projeção manual equivalente para evitar duplicidade;
- Budget/Forecast/DRE precisam enxergar a mesma automação;
- depreciação termina ao fim da vida útil, mas isso não baixa o bem;
- bem totalmente depreciado continua no patrimônio até baixa efetiva;
- `imobilizados` é dependência crítica, não opcional, para as integrações automáticas.

A regra Firestore de `imobilizados` precisa estar efetivamente publicada no Firebase, não apenas presente no repositório.

---

## 14. Fail-closed de dados contábeis críticos

**Regra geral:** indisponibilidade de base crítica não equivale a base vazia.

Quando uma coleção alimenta valor contábil, projeção, trava de edição ou validação de integridade:

- erro de leitura deve ser registrado;
- cálculo/ação dependente deve ser bloqueado;
- usuário deve receber mensagem coerente;
- não converter `permission-denied`, indisponibilidade de rede ou precondição em `[]`/zero silencioso.

Na baseline 01/09/2026 essa regra foi aplicada a `imobilizados`, que alimenta:

- Balanço;
- Input patrimonial;
- Budget;
- Forecast;
- DRE projetada;
- validação de inativação do Plano de Contas.

---

## 15. DRE, Dashboard e Prestação

Os relatórios devem compartilhar interpretação financeira.

`js/financial-reporting.js` é o núcleo comum preferencial para relatórios gerenciais.

Nunca recriar regra local do tipo “Receita = receita; todo o resto = OPEX”.

Regras:

- Balanço não entra em Resultado;
- Estatística não entra em Resultado;
- natureza/multiplicador vem do núcleo contábil;
- consolidação multiempresa financeira deve ser semanticamente compatível por código;
- versões de Budget/Forecast devem respeitar cada empresa;
- depreciação automática não pode ser duplicada;
- DRE projetada não pode omitir depreciação porque a coleção do Imobilizado falhou silenciosamente.

Prestação de Contas é monoempresa.

---

## 16. Fluxo de Caixa

Fluxo de Caixa é monoempresa.

Ao entrar em contexto multiempresa:

- limpar dados exibidos;
- bloquear criar/editar/exportar;
- fechar formulários;
- informar claramente a restrição;
- não gravar nada usando empresa implícita.

Competência contábil e data financeira são conceitos diferentes.

CAPEX ainda não possui integração automática completa de desembolso no Fluxo de Caixa nesta baseline.

---

## 17. Fechamentos

- checklist idempotente;
- duplicidades legadas não devem ser recriadas;
- competência fechada/bloqueada protege telas de lançamento;
- histórico anterior permanece intacto quando configuração muda temporalmente.

---

## 18. Compatibilidade e dados antigos

Uma atualização deve assumir que existem dados legados.

Usar:

- defaults compatíveis;
- campos novos sem destruir antigos;
- canonicalização;
- flags de legado/duplicidade quando apropriado;
- migrações idempotentes;
- rollback.

Não corrigir banco para esconder bug visual antes de corrigir o código.

---

## 19. Código legado

Versões antigas podem permanecer no repositório.

Não:

- importar versão antiga só porque ela existe;
- reativar rota obsoleta por atalho;
- apagar arquivo antigo sem provar que nenhuma rota/import/migração depende dele.

Eliminar primeiro “duas verdades” de execução; remover arquivo físico apenas quando seguro.

---

## 20. Processo obrigatório de mudança estrutural

1. ler `AGENTS.md`, Dossiê, Manual, Guia e documento Firebase;
2. inspecionar `main` e branch de trabalho;
3. conferir rota ativa;
4. identificar coleções e caminhos Storage afetados;
5. implementar com compatibilidade;
6. atualizar Rules no mesmo pacote quando necessário;
7. atualizar testes/workflows;
8. validar sintaxe/imports/browser;
9. validar fail-closed das dependências financeiras;
10. atualizar Dossiê/Guia/documentação específica;
11. comparar com `main`;
12. só então promover;
13. acompanhar QA e Pages da `main`;
14. publicar Rules separadamente quando alteradas;
15. testar com usuário autenticado em produção.

---

## 21. Deploy Firebase

O contrato de destino está em:

- `.firebaserc`;
- `firebase.json`.

O procedimento está em `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`.

Quando Rules mudarem, a release exige deploy autenticado específico. O comando operacional atual é:

```bash
firebase deploy --only firestore:rules,storage
```

Não armazenar credenciais no repositório.

---

## 22. O que nunca fazer

- lançar em Sintética;
- somar duplicidade silenciosamente;
- misturar Ativo/Passivo/Estatística em OPEX;
- somar posições mensais do Balanço;
- regravar saldo bruto com multiplicador;
- quebrar vigência histórica;
- apagar versão anterior de Budget/Forecast;
- usar contexto multiempresa em tela monoempresa;
- expor segredo no frontend;
- tratar privacidade do repositório como substituto de Firestore Rules;
- assumir que Pages publicou Rules;
- tratar erro de coleção contábil crítica como `[]`/zero;
- inativar conta sem conseguir validar vínculos futuros;
- publicar mudança estrutural sem QA, Rules compatíveis e documentação.

---

## 23. Ordem oficial de leitura

1. `AGENTS.md`;
2. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`;
3. `docs/SIG-MANUAL-MESTRE.md`;
4. `docs/SIG-GUIA-DE-CONTINUIDADE.md`;
5. `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`;
6. `SECURITY.md`;
7. `app.js`;
8. `js/controllership-router.js` quando aplicável;
9. `firestore.rules` / `storage.rules`;
10. `firebase.json` / `.firebaserc`;
11. `.github/workflows/`.

Não há documentos obrigatórios ocultos ou nomes de arquivos inexistentes fora dessa lista.
