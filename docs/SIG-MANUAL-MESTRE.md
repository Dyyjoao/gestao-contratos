# SIG — Manual Mestre de Arquitetura e Regras

> Documento de continuidade do Sistema Integrado de Gestão (SIG).
> Atualizado em: 31/08/2026.
>
> Objetivo: permitir que o SIG continue evoluindo com coerência mesmo em outra conversa, outro desenvolvedor, outra IA, outro repositório ou outra hospedagem.

## 1. Princípio central

A lógica do SIG não deve depender de memória de conversa. Ela deve existir em três lugares versionados:

1. **Código-fonte** — comportamento executável.
2. **Regras de segurança e modelo de dados** — Firestore/Storage.
3. **Documentação em `/docs`** — intenção, invariantes, decisões e processo de evolução.

Se código e documentação divergirem, deve-se inspecionar o comportamento atual, corrigir a divergência e atualizar a documentação na mesma versão.

## 2. Filosofia do produto

O SIG não é uma coleção de telas isoladas. Ele deve funcionar como um sistema integrado em cinco camadas:

- **Operação:** Contratos, Prestadores, Frota, Almoxarifado, Solicitações/Cotações.
- **Gestão:** Controladoria & FP&A.
- **Controle:** Governança & Compliance.
- **Execução:** Minha Mesa, exceções, planos de ação e aprovações.
- **Direção:** Dashboard, Prestação de Contas e futuro Board Mode.

O sistema deve reduzir esquecimento, retrabalho e dependência de controles paralelos. A tela deve orientar o usuário sobre o que requer ação ou decisão.

## 3. Arquitetura técnica atual

### Frontend

- Aplicação web estática em HTML/CSS/JavaScript ES Modules.
- Entrada principal: `index.html` + `app.js`.
- Módulos em `/js`.
- Carregamento pesado preferencialmente sob demanda.
- Hospedagem atual: GitHub Pages.

### Backend gerenciado

- Firebase Authentication.
- Cloud Firestore.
- Regras de segurança em `firestore.rules`.
- `storage.rules` mantido como preparação futura para Firebase Storage.
- Não existe servidor de aplicação próprio neste momento.

### Regra estrutural importante

**Hospedagem do frontend e banco de dados são independentes.**

Mover o site do GitHub Pages para outro host não move nem apaga o Firestore. Mantendo o mesmo projeto Firebase e a mesma configuração de conexão, o novo frontend utiliza a mesma base de dados.

## 4. Contexto global

O cabeçalho do SIG define o contexto operacional global:

- Grupo empresarial.
- Empresa(s) selecionada(s).
- Exercício.
- Competência/período.

Módulos devem reutilizar esse contexto e evitar pedir novamente empresa/período sem necessidade.

Algumas telas de lançamento exigem exatamente uma empresa e uma competência mensal; telas gerenciais podem aceitar consolidação de empresas, trimestre ou exercício completo.

## 5. Multiempresa e segregação

Os documentos operacionais devem possuir, quando aplicável:

- `grupoId`
- `empresaId`

A segurança real é garantida pelas regras do Firestore, não por ocultação visual.

A interface de permissões controla experiência de uso, mas não substitui `firestore.rules`.

## 6. Controladoria & FP&A — invariantes

### Plano de Contas Gerencial

A estrutura é multinível:

`Grupo DRE → Conta Sintética → Conta Sintética ... → Conta Analítica`

Regras:

- **Sintética:** agrupadora; nunca recebe lançamento manual.
- **Analítica:** folha lançável.
- `contaPaiId` define a hierarquia.
- `tipoEstrutura` diferencia `sintetica` e `analitica`.
- Não permitir ciclos hierárquicos.
- Conta com filhas não pode virar Analítica sem reorganização prévia das filhas.

### Centro de Custo × Conta

- Centros de custo recebem autorização somente para contas **Analíticas financeiras**.
- Contas Sintéticas são calculadas automaticamente pelas descendentes.
- Contas Estatísticas não entram na matriz normal de Centros.

### Estatísticas / Indicadores

Existe um Centro de Custo técnico interno:

`__cc_estatistico__`

Ele serve apenas para persistência e agregação técnica.

Na experiência do usuário, Estatísticas/Indicadores aparecem como bloco próprio e não como um centro operacional comum.

### Input Mensal

- Uma empresa por lançamento.
- Uma competência mensal por lançamento.
- Somente Analíticas são digitáveis.
- Sintéticas aparecem como subtotal automático.
- Indicadores calculados não são digitáveis.
- Duplicidades devem ser ignoradas/canonicalizadas; nunca somadas silenciosamente.
- Competência fechada/bloqueada não pode ser alterada sem reabertura apropriada.

### Budget

O Budget é anual e acompanha o exercício global, independentemente da competência mensal selecionada no cabeçalho.

Ciclo:

`NÃO ABERTO → EM ELABORAÇÃO → FINALIZADO`

Pode ser reaberto quando autorizado.

O Budget possui versões por exercício e permite criação de nova versão.

A matriz apresenta:

- Realizado A-1.
- Budget mês a mês.
- Variações.
- Total anual.
- RESULTADO / SALDO.

Sintéticas somam as Analíticas descendentes. Analíticas recebem sublinhas ou premissas.

### Forecast

- Mesmo plano e mesma hierarquia do Budget.
- Meses fechados vêm do Realizado.
- Meses futuros vêm da projeção.
- Resultado final representa o FY Forecast.

### DRE Gerencial

- Saída gerencial, não tela de lançamento.
- Pode ser vista por Centro de Custo ou consolidada por conta.
- Pode mostrar Realizado, Budget ou Forecast.
- Suporta mês, trimestre e exercício completo.
- Sintéticas podem ser expandidas/recolhidas.
- Exportações devem respeitar a estrutura exibida.
- Estatísticas ficam em bloco separado da DRE financeira.
- Deve existir linha final de `RESULTADO / SALDO DO PERÍODO`.

## 7. Minha Mesa

A Minha Mesa é a camada de execução e deve concentrar:

- Exceções relevantes.
- Pendências que exigem atenção.
- Planos de ação.
- Futuramente aprovações, SLA e notificações.

A lógica desejada é: o usuário abre o SIG e entende o que precisa resolver antes de navegar por módulos.

## 8. Governança & Compliance

Governança é camada de controle e não deve ser confundida com operação.

Direções previstas/implementadas incluem:

- Obrigações.
- Riscos.
- Auditorias/programas/ciclos.
- Planos de ação.
- SST separado quando aplicável.

## 9. Dados e anexos

Estratégia atual de anexos:

- Google Drive como solução temporária.
- Firestore armazena metadados/referência do arquivo.
- Futuro: Firebase Storage quando houver infraestrutura/plano adequado.

Formato conceitual dos anexos:

```text
provider
nome
mimeType
tamanho
url
driveFileId ou storagePath
categoria
enviadoPor
enviadoEm
```

Nunca armazenar segredos, chaves privadas ou credenciais administrativas no frontend ou no repositório.

## 10. Coleções relevantes

Entre as coleções atualmente utilizadas/previstas no núcleo gerencial estão:

- `usuarios`
- `perfisAcesso`
- `gruposEmpresariais`
- `empresas`
- `contratos`
- `prestadores`
- `veiculos`
- `manutencoesFrota`
- `itensAlmoxarifado`
- `movimentacoesEstoque`
- `cotacoes`
- `centrosCusto`
- `planoContasGerencial`
- `premissasPlanejamento`
- `realizadoMensal`
- `budgetLinhas`
- `forecastLinhas`
- `planejamentoDetalhes`
- `contasBancarias`
- `fluxoCaixaLancamentos`
- `fluxoCaixaFixos`
- `prestacaoContas`
- `prestacaoComentarios`
- `fechamentoTarefas`
- `fechamentosMensais`
- `planosAcao`
- `permutas`
- `permutaMovimentos`

A existência de uma coleção não autoriza automaticamente acesso: sempre conferir `firestore.rules`.

## 11. Regra de evolução

Uma mudança que altera comportamento estrutural deve atualizar, na mesma entrega:

1. Código.
2. Testes/Quality Check.
3. Rules/índices quando necessários.
4. Documentação correspondente em `/docs`.
5. Registro da decisão em `DECISOES-ARQUITETURAIS.md` quando a mudança modificar uma regra fundamental.

## 12. O que nunca fazer

- Não usar ocultação de botão como única segurança.
- Não expor chave privada, service account ou token secreto no frontend.
- Não editar produção sem histórico de versão.
- Não apagar/migrar dados de forma destrutiva sem backup e plano de reversão.
- Não duplicar módulos novos e antigos sem remover/arquivar a rota obsoleta.
- Não somar documentos duplicados silenciosamente em demonstrativos.
- Não lançar diretamente em conta Sintética.
- Não acoplar a persistência do Firestore ao provedor de hospedagem.

## 13. Ordem recomendada de leitura para manutenção

1. `docs/CONTEXTO-PARA-IA.md`
2. `docs/SIG-MANUAL-MESTRE.md`
3. `docs/MODELO-DE-DADOS-E-MIGRACOES.md`
4. `docs/VERSIONAMENTO-E-RELEASE.md`
5. `docs/HOSPEDAGEM-DOMINIO-E-PRIVACIDADE.md`
6. `docs/DECISOES-ARQUITETURAIS.md`
7. Código atual e `firestore.rules`.

Este documento deve evoluir junto com o SIG.
