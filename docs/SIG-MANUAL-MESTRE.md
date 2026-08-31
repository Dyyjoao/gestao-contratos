# SIG — Manual Mestre de Arquitetura e Regras

> Documento de invariantes do Sistema Integrado de Gestão (SIG).  
> Atualizado em: 31/08/2026.

Este Manual não tenta listar cada detalhe de implementação. O estado funcional completo está em `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`. Aqui ficam as regras que uma evolução não pode quebrar silenciosamente.

---

## 1. Princípio central

A lógica do SIG deve existir em fontes versionadas:

1. código-fonte;
2. `firestore.rules` / `storage.rules`;
3. `SECURITY.md`;
4. documentação em `/docs`;
5. QA automatizado.

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
- regras de segurança em `firestore.rules`;
- hospedagem do frontend independente do banco.

Trocar de host ou domínio não deve exigir zerar/migrar o Firestore quando o mesmo projeto Firebase continuar sendo usado.

---

## 4. Contexto global e multiempresa

O cabeçalho define Grupo, Empresa(s), Exercício e Período.

Regras:

- relatórios podem aceitar várias empresas;
- telas de lançamento devem exigir uma única empresa quando a identidade do documento pertence a uma empresa;
- nenhuma tela pode escolher silenciosamente a primeira empresa de um contexto múltiplo;
- mudança de contexto em tela aberta deve invalidar/recarregar/bloquear a visão conforme o módulo.

Fluxo de Caixa e Prestação de Contas são monoempresa.

---

## 5. Segurança

A segurança real está em `firestore.rules`, não na interface.

Nunca:

- depender de botão oculto;
- expor segredo administrativo no navegador/repositório;
- permitir troca silenciosa de `grupoId`/`empresaId` para escapar de escopo;
- publicar nova coleção ou padrão de escrita sem revisar Rules.

A política detalhada está em `SECURITY.md`.

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
- vigência por exercício não apaga histórico.

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

---

## 10. Balanço Patrimonial

Balanço é posição de fechamento.

- meses não são somados para formar saldo;
- Ativo/Passivo usam natureza/multiplicador central;
- redutoras reduzem subtotais;
- multiempresa consolida por código contábil;
- diferença Ativo − Passivo/PL deve ficar visível;
- divergência de natureza do mesmo código entre empresas deve ser tratada como inconsistência;
- Imobilizado pode alimentar automaticamente as contas mapeadas.

---

## 11. Budget, Forecast e Premissas

### Budget

- anual;
- exercício vem do cabeçalho;
- ciclo: `NÃO ABERTO → EM ELABORAÇÃO → FINALIZADO`;
- versões preservam histórico;
- A-1 é o exercício anterior ao selecionado;
- linha Analítica principal é calculada pelas sublinhas/memórias;
- Sintética soma descendentes.

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

A DRE recebe depreciação/amortização quando configurada; o Balanço recebe ativo bruto e depreciação acumulada quando integrado.

Regras:

- não depreciar antes da data disponível para uso;
- Depreciação Acumulada deve ser redutora do Ativo;
- conta de despesa deve ser compatível com resultado;
- automação de depreciação substitui projeção manual equivalente para evitar duplicidade;
- Budget/Forecast/DRE precisam enxergar a mesma automação.

---

## 14. DRE, Dashboard e Prestação

Os relatórios devem compartilhar interpretação financeira.

`js/financial-reporting.js` é o núcleo comum preferencial para relatórios gerenciais.

Nunca recriar regra local do tipo “Receita = receita; todo o resto = OPEX”.

Regras:

- Balanço não entra em Resultado;
- Estatística não entra em Resultado;
- natureza/multiplicador vem do núcleo contábil;
- consolidação multiempresa financeira deve ser semanticamente compatível por código;
- versões de Budget/Forecast devem respeitar cada empresa;
- depreciação automática não pode ser duplicada.

Prestação de Contas é monoempresa.

---

## 15. Fluxo de Caixa

Fluxo de Caixa é monoempresa.

Ao entrar em contexto multiempresa:

- limpar dados exibidos;
- bloquear criar/editar/exportar;
- fechar formulários;
- informar claramente a restrição;
- não gravar nada usando empresa implícita.

Competência contábil e data financeira são conceitos diferentes.

---

## 16. Fechamentos

- checklist idempotente;
- duplicidades legadas não devem ser recriadas;
- competência fechada/bloqueada protege telas de lançamento;
- histórico anterior permanece intacto quando configuração muda temporalmente.

---

## 17. Compatibilidade e dados antigos

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

## 18. Código legado

Versões antigas podem permanecer no repositório.

Não:

- importar versão antiga só porque ela existe;
- reativar rota obsoleta por atalho;
- apagar arquivo antigo sem provar que nenhuma rota/import/migração depende dele.

Eliminar primeiro “duas verdades” de execução; remover arquivo físico apenas quando seguro.

---

## 19. Processo obrigatório de mudança estrutural

1. ler `AGENTS.md` e Dossiê;
2. inspecionar `main` e branch de trabalho;
3. conferir rota ativa;
4. implementar com compatibilidade;
5. atualizar testes/workflow;
6. validar sintaxe/imports/browser;
7. validar Rules se houver persistência;
8. atualizar Dossiê/Guia/documentação específica;
9. comparar com `main`;
10. só então promover;
11. acompanhar QA da `main` e deploy.

---

## 20. O que nunca fazer

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
- publicar mudança estrutural sem QA e documentação.

---

## 21. Ordem oficial de leitura

1. `AGENTS.md`;
2. `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`;
3. `docs/SIG-MANUAL-MESTRE.md`;
4. `docs/SIG-GUIA-DE-CONTINUIDADE.md`;
5. `SECURITY.md`;
6. `app.js`;
7. `js/controllership-router.js` quando aplicável;
8. `firestore.rules` / `storage.rules`;
9. `.github/workflows/js-check.yml`.

Não há documentos obrigatórios ocultos ou nomes de arquivos inexistentes fora dessa lista.