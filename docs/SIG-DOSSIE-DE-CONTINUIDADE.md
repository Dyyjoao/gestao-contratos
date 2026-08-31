# SIG - Dossiê de Continuidade do Projeto

**Sistema Integrado de Gestão (SIG)**  
**Documento portátil de handoff técnico, funcional e arquitetural**  
**Baseline:** 31/08/2026  
**Repositório de referência:** `Dyyjoao/gestao-contratos`  
**Branch de produção:** `main`

---

## 0. Como usar este documento

Este arquivo deve ser suficiente para uma nova IA, desenvolvedor ou equipe entender o SIG antes de alterar o projeto.

Ao receber este documento, o responsável deve:

1. entender a filosofia do produto e as invariantes abaixo;
2. conferir o código atual da `main` antes de assumir que uma versão citada aqui ainda é a vigente;
3. conferir `firestore.rules` antes de criar ou alterar persistência;
4. manter compatibilidade com os dados existentes;
5. atualizar este dossiê sempre que uma decisão estrutural mudar.

**Regra de ouro:** conversa, memória de IA e conhecimento informal nunca são a única fonte de verdade do SIG.

---

# 1. Visão do produto

O SIG é um sistema empresarial orientado a gestão, controle e decisão. Ele não deve evoluir como uma coleção de telas isoladas.

A arquitetura conceitual do produto é:

- **Operação:** fontes de eventos e compromissos empresariais.
- **Gestão:** Controladoria & FP&A.
- **Controle:** Governança & Compliance.
- **Execução:** Minha Mesa, exceções e planos de ação.
- **Direção:** Dashboard, Prestação de Contas e futuro Board Mode.

No produto atual, o foco principal do SIG foi reduzido para preservar desempenho e profundidade: **Contratos permanece ativo porque alimenta a visão gerencial; Controladoria & FP&A; Governança & Compliance; Administração; Minha Mesa; Dashboard**. Códigos de módulos operacionais antigos podem continuar no repositório, mas não devem ser reativados no SIG sem decisão arquitetural explícita. A ideia é reaproveitá-los futuramente em um sistema separado de Gestão de Operações.

## 1.1 Objetivos do SIG

O sistema deve:

- reduzir planilhas paralelas e informações soltas;
- evitar perda de histórico e duplicidade de lançamentos;
- tornar desvios e pendências visíveis;
- transformar números em decisões e planos de ação;
- permitir visão por empresa, grupo, exercício, período, Centro de Custo e conta;
- manter trilha de quem alterou, abriu, fechou, concluiu ou reabriu processos críticos;
- preservar dados entre versões do frontend e entre provedores de hospedagem.

---

# 2. Arquitetura técnica atual

## 2.1 Frontend

- Aplicação web estática em HTML, CSS e JavaScript ES Modules.
- Entrada principal: `index.html` e `app.js`.
- Módulos em `/js`.
- Aplicação com comportamento PWA.
- Hospedagem atual: GitHub Pages.
- Não existe servidor de aplicação próprio na arquitetura atual.

O `app.js` carrega o núcleo e as áreas ativas: autenticação/contexto, Minha Mesa, Administração, Contratos, shell gerencial, roteador de Controladoria, Governança, Dashboard e geração de PDF da Prestação.

## 2.2 Backend gerenciado

- Firebase Authentication.
- Cloud Firestore.
- Firestore Security Rules em `firestore.rules`.
- `storage.rules` mantido para evolução futura.
- Anexos atualmente podem referenciar Google Drive; Firebase Storage é evolução prevista.

## 2.3 Regra crítica: hospedagem e banco são independentes

O banco do SIG **não está dentro do GitHub Pages**.

GitHub Pages hospeda apenas os arquivos do frontend. Os dados ficam no projeto Firebase. Portanto:

- mudar GitHub Pages para Vercel, Netlify, Firebase Hosting, Cloudflare Pages ou outro host **não apaga nem migra automaticamente o Firestore**;
- manter o mesmo projeto Firebase significa continuar usando a mesma base de dados;
- uma nova versão do site deve ser compatível com o modelo de dados já existente;
- migração de dados só é necessária quando o próprio modelo do Firestore mudar.

Essa separação é uma das garantias fundamentais de continuidade do projeto.

---

# 3. Contexto global e multiempresa

O cabeçalho do SIG é o contexto global do sistema.

Ele deve controlar:

1. **Grupo empresarial** - seleção única;
2. **Empresa(s)** do grupo - uma, várias ou todas, conforme módulo;
3. **Exercício**;
4. **Período** - Total, T1, T2, T3, T4 ou mês.

## 3.1 Regras de uso

- Módulos gerenciais podem aceitar múltiplas empresas para consolidação.
- Telas de lançamento normalmente exigem uma única empresa.
- Input Mensal exige competência mensal.
- Budget é anual: o **exercício global** define qual orçamento está aberto. A competência Jan/T1/Total do cabeçalho não reduz a matriz de edição do Budget.
- DRE e Dashboard usam o período global para apresentação.
- Telas pesadas não devem consultar Firestore repetidamente a cada pequeno clique. Quando apropriado, a mudança de contexto marca a tela como desatualizada e o usuário confirma em **Atualizar**.

---

# 4. Segurança e permissões

A segurança do SIG não pode depender de botões escondidos.

Existem duas camadas:

- **Interface/perfil:** controla o que o usuário enxerga e quais ações são oferecidas.
- **Firestore Rules:** controla o que o usuário realmente consegue ler/gravar no banco.

Sempre que uma nova coleção ou novo padrão de escrita for criado, validar `firestore.rules` antes de publicar.

## 4.1 Segredos

Nunca colocar no frontend ou repositório:

- Service Account JSON;
- chave privada;
- senha;
- token administrativo;
- segredo de API OpenAI ou outro backend;
- credenciais de banco.

A configuração pública do Firebase Web App não é uma credencial administrativa, porém restrições e boas práticas do Google Cloud devem ser usadas quando aplicáveis.

---

# 5. Controladoria & FP&A - arquitetura vigente

A Controladoria é acessada por submenu expansível e carrega módulos sob demanda para reduzir travamentos.

O roteador atual aponta para:

- DRE Gerencial - `ctrl-dre-v6.js`;
- Input Mensal - `ctrl-input-v6.js`;
- Budget - `ctrl-budget-v7.js`;
- Forecast - `ctrl-forecast-v5.js`;
- Fluxo de Caixa - módulo sob demanda;
- Prestação de Contas - módulo sob demanda;
- Cockpit de Fechamento - `closing-v3.js`;
- Permutas;
- Premissas;
- Plano de Contas - `ctrl-chart-accounts-v3.js`;
- Centros de Custo;
- Configurações.

Versões numéricas dos arquivos servem para evolução técnica; **a rota atual é a fonte de verdade**.

---

# 6. Plano de Contas Gerencial

O plano de contas é uma **árvore gerencial multinível**, não uma lista plana.

Exemplo:

```text
CUSTOS INDUSTRIAIS
  CC Produção
    Manutenção                         [Sintética]
      Máquinas e Equipamentos          [Sintética]
        Peças                          [Analítica]
        Serviços de terceiros          [Analítica]
      Contratos                        [Sintética]
        Preventiva                     [Analítica]
        Corretiva                      [Analítica]
```

## 6.1 Sintética x Analítica

**Conta Sintética**

- agrupa contas filhas;
- nunca recebe lançamento manual;
- valor é calculado pela composição das descendentes;
- pode ter vários níveis de Sintéticas abaixo dela;
- pode ser expandida/recolhida na DRE.

**Conta Analítica**

- é folha da árvore;
- pode receber realizado, sublinhas de Budget/Forecast ou premissas, conforme regra;
- é a única conta financeira elegível para matriz Centro de Custo × Conta.

`contaPaiId` define a conta superior e `tipoEstrutura` define Sintética/Analítica.

Não permitir ciclos hierárquicos.

---

# 7. Centro de Custo x Conta

Centro de Custo responde **onde ocorreu**. Conta responde **o que ocorreu**.

Um grupo como Manutenção não deve ser transformado em CC apenas para criar hierarquia de contas.

A matriz de vínculo deve listar somente:

- contas financeiras;
- Analíticas;
- ativas.

Sintéticas são inferidas automaticamente pela árvore e não precisam ser vinculadas ao CC.

---

# 8. Estatísticas e Indicadores

Estatísticas usam a mesma estrutura de contas, mas possuem tratamento próprio.

## 8.1 Centro técnico invisível

O sistema utiliza um Centro de Custo técnico reservado:

```text
__cc_estatistico__
```

Finalidade:

- manter chaves Empresa × CC × Conta consistentes;
- evitar confundir estatística válida com documento financeiro legado sem CC;
- permitir que DRE/Budget/Forecast/Input usem a mesma infraestrutura de persistência.

Esse CC **não deve aparecer como Centro de Custo operacional normal** no cadastro ou na matriz.

Visualmente, Estatísticas aparecem como um bloco próprio no topo das matrizes.

## 8.2 Tipos de conta estatística

A arquitetura aceita:

- **Driver operacional:** quantidade produzida, quantidade vendida, m² de laje, capacidade, horas etc.;
- **Indicador calculado:** custo médio/unidade, margem EBITDA, produtividade, GOP etc.

## 8.3 Regra aprovada: Manual x Automática

Cada conta Estatística Analítica deve possuir um **modo de preenchimento explícito e persistente**:

- `manual` - valor informado pelo usuário no Input;
- `automatico` - valor calculado exclusivamente pela regra/fórmula do indicador.

Regras:

- contas antigas sem flag devem ser tratadas como **Manual por compatibilidade**, até configuração explícita;
- Manual não deve ser recalculada automaticamente só porque existe uma fórmula experimental;
- Automática não aceita digitação no Input;
- alteração Manual ↔ Automática deve ocorrer conscientemente no cadastro;
- Sintética continua sempre calculada pelas filhas, independentemente desse flag.

Separar conceitualmente:

- `tipoEstatistica`: Driver / Indicador calculado;
- `modoPreenchimentoEstatistico`: Manual / Automático.

Exemplos:

- Quantidade produzida: Driver + Manual hoje; futuramente pode virar Driver + Automático por integração com produção.
- Custo médio por unidade: Indicador calculado + Automático.

## 8.4 Consolidação por período

Conta estatística deve declarar como consolida:

- Soma;
- Média;
- Último valor;
- Recalcular fórmula.

Nunca somar percentuais ou índices calculados apenas porque a DRE está mostrando trimestre/ano.

---

# 9. Input Mensal

Regras fundamentais:

- uma empresa por lançamento;
- uma competência mensal;
- Sintéticas nunca são digitáveis;
- Analíticas financeiras autorizadas no CC podem receber lançamento;
- Estatísticas usam o CC técnico invisível;
- Estatística Manual é digitável;
- Estatística Automática é bloqueada e deve mostrar claramente que é calculada;
- fechamento/bloqueio da competência impede alterações;
- documentos duplicados nunca devem ser somados silenciosamente;
- o documento canônico deve prevalecer e duplicidades devem ser arquivadas/controladas.

O botão de limpeza de legado deve considerar **financeiro sem CC** como legado, mas nunca arquivar Estatísticas válidas no CC técnico.

---

# 10. Budget

## 10.1 Conceito

Budget é um orçamento anual orientado a DRE.

A visão deve ser:

```text
ESTATÍSTICAS / INDICADORES
  contas estatísticas...

RECEITAS
  CC Comercial
    Sintéticas
      Analíticas

CUSTOS INDUSTRIAIS
  CC Produção
    Sintéticas
      Analíticas

...

RESULTADO / SALDO
```

## 10.2 Ciclo do orçamento

O Budget possui ciclo formal por Empresa + Exercício + Versão:

```text
NÃO ABERTO -> EM ELABORAÇÃO -> FINALIZADO
```

Ações:

- Abrir orçamento;
- Finalizar orçamento;
- Reabrir orçamento;
- Criar nova versão.

O exercício vem do cabeçalho global.

Finalizado significa bloqueio de edição do ciclo, salvo reabertura autorizada.

## 10.3 Lançamento

- linha principal Analítica não recebe edição direta;
- lançamento ocorre em sublinhas/memória de cálculo;
- linha principal soma sublinhas;
- Sintética soma descendentes;
- conta pode ser fechada individualmente para reduzir erro operacional.

## 10.4 A-1 e variação

A referência A-1 deve usar o exercício anterior ao exercício selecionado.

Exemplo: Budget 2027 compara com Realizado 2026.

Nunca usar o ano corrente apenas porque é o ano atual do calendário.

---

# 11. Forecast

Forecast compartilha a mesma árvore do Budget.

Regra principal:

```text
FY Forecast = meses fechados do Realizado + meses futuros projetados
```

- mês já fechado pertence ao Realizado e não deve ser reescrito pelo Forecast;
- futuro recebe sublinhas/premissas;
- Sintéticas somam descendentes;
- Estatísticas aparecem no topo;
- existe RESULTADO / SALDO final.

---

# 12. Premissas

Premissas normais são amarradas a Conta Gerencial e, quando necessário, a Centro de Custo.

Regra de precedência:

**Premissa específica do CC vence premissa corporativa/Todos.**

Premissas são sazonais mês a mês. Pode existir regra-base com replicação aos 12 meses, mas cada mês pode ter override.

Drivers já definidos:

- A-1 + percentual;
- valor fixo;
- repetir A-1;
- quantidade × preço unitário.

Conta × CC com premissa ativa no escopo correspondente bloqueia lançamento manual do Budget/Forecast.

A sublinha gerada por premissa deve ter origem identificável (`premissa`) e não se confundir com sublinha manual.

---

# 13. Receita e modelo industrial

A empresa-alvo possui produção de artefatos cimentícios, como blocos e lajes.

Por isso o FP&A deve privilegiar drivers operacionais.

Exemplo:

```text
Receita = Quantidade vendida × Preço médio
```

Produção e venda são grandezas diferentes.

Exemplo de encadeamento futuro:

```text
Quantidade produzida
  -> consumo padrão de cimento
  -> toneladas necessárias
  -> preço projetado da matéria-prima
  -> custo de cimento
  -> custo industrial por unidade
```

Isso é preferível a aplicar apenas um percentual genérico sobre o ano anterior.

---

# 14. DRE Gerencial

A DRE é relatório, não tela de lançamento.

## 14.1 Modos de apresentação

- Por Centro de Custo;
- Consolidada por conta.

## 14.2 Estatísticas

Na visão por CC com **Todos**, o bloco Estatísticas aparece primeiro.

Também pode ser escolhido isoladamente como **Estatísticas / Indicadores**.

Na DRE Consolidada financeira, Estatísticas não devem aparecer misturadas ao resultado.

## 14.3 Hierarquia

Contas Sintéticas devem possuir expandir/recolher.

- recolhida: exibe subtotal da Sintética e oculta descendentes;
- expandida: exibe composição;
- atalhos: Expandir tudo / Recolher tudo.

## 14.4 Períodos

- Mês: um mês;
- Trimestre: meses do trimestre + consolidado do trimestre;
- Total: meses + T1/T2/T3/T4 + total anual, conforme desenho vigente.

## 14.5 Exportações

A DRE deve oferecer:

- Excel;
- Imprimir/PDF.

O relatório exportado deve respeitar, sempre que tecnicamente possível, o nível de detalhamento atualmente visível.

---

# 15. Linha de RESULTADO / SALDO

Budget, Forecast e DRE financeira precisam apresentar saldo/resultado ao final.

Estatísticas não entram nesse cálculo financeiro.

Receitas aumentam resultado; deduções, custos, despesas e impostos reduzem, conforme natureza configurada.

---

# 16. Fluxo de Caixa

O Fluxo de Caixa é parte da Controladoria e deve manter visão de posição, D+30, D+60 e D+90, além de compromissos/provisões.

Evolução aprovada: valores calculados por motores especializados podem gerar projeção financeira sem duplicar a competência contábil/gerencial.

Exemplo tributário:

```text
PIS/COFINS de Jan
  -> DRE/competência Jan
  -> pagamento/caixa em Fev
```

---

# 17. Prestação de Contas

Situação atual: funcional, porém considerada **genérica** e marcada para evolução.

Visão desejada do futuro pacote mensal:

1. Resumo executivo;
2. Receita e volume;
3. Produção e indicadores;
4. Custos industriais;
5. Custo médio por unidade;
6. Margens, EBITDA/GOP quando parametrizados;
7. Budget × Realizado × Forecast;
8. Caixa;
9. Desvios acima da materialidade;
10. Comentários dos gestores;
11. Riscos;
12. Planos de ação;
13. Outlook.

A ideia é explicar **por que** o resultado mudou, e não apenas listar números.

---

# 18. Cockpit de Fechamento

Existe fechamento mensal e anual.

## 18.1 Checklist idempotente

Criar checklist repetidamente não pode duplicar tarefas.

A identidade deve ser determinística por Empresa × Competência × tarefa do modelo.

Duplicidades legadas podem ser arquivadas sem destruir histórico.

## 18.2 Modelo temporal

Configuração deve suportar:

- adicionar tarefa a partir da competência selecionada;
- inativar dali em diante;
- reativar dali em diante;
- excluir tarefa customizada dali em diante.

Períodos anteriores permanecem históricos.

---

# 19. Permutas

Permutas precisam de razão/histórico próprio porque a simples visão de saldo não permite avaliar benefício econômico.

Conceitos:

```text
Saldo contratual = créditos gerados - consumos/recebimentos
```

```text
Resultado econômico = valor de mercado recebido - custo interno do que foi entregue
```

Permutas entre empresas do grupo podem exigir lançamentos espelhados e vínculo entre movimentos.

---

# 20. Contratos

Contratos permanece no SIG porque é fonte de informações gerenciais e financeiras.

O módulo deve alimentar:

- vencimentos/exceções na Minha Mesa;
- compromissos e projeções quando configurados;
- análises de contratos recorrentes no fechamento;
- anexos/referências documentais.

Anexos usam Google Drive como estratégia temporária e Firestore armazena metadados/referências.

---

# 21. Minha Mesa e Planos de Ação

Minha Mesa é a camada de execução.

Deve responder: **o que precisa da atenção do usuário agora?**

Fontes atuais/relevantes:

- contratos;
- Controladoria/caixa;
- planos de ação;
- futuramente aprovações, SLA, compliance e notificações.

Planos de ação devem permitir filtro de Abertas, Vencidas, Concluídas e Todas.

Módulos removidos do escopo ativo não devem gerar atalhos órfãos na Minha Mesa.

---

# 22. Governança & Compliance

Camada separada da operação.

Direções atuais:

- obrigações;
- riscos;
- programas de auditoria;
- ciclos de auditoria;
- geração de planos de ação;
- SST como domínio específico quando aplicável.

Planos de auditoria devem ser completos antes de validação final da aba.

---

# 23. Motor tributário - decisão arquitetural aprovada, implementação futura

Criar uma área específica de **Premissas Tributárias / Planejamento Tributário**.

Não tratar tributos como simples `% sobre conta`.

O motor deve ser versionado por exercício e suportar cenários como:

- Simples Nacional;
- Lucro Presumido;
- Lucro Real.

Capacidades desejadas:

- mix de atividades;
- regras e alíquotas por vigência;
- RBT12/faixas/segregações no Simples;
- presunções, IRPJ/CSLL, adicional e PIS/COFINS no Presumido;
- bases, ajustes, créditos e prejuízos fiscais no Real;
- calendário de recolhimento;
- contas gerenciais de destino;
- comparação entre cenários;
- promover cenário para Budget/Forecast;
- alimentar Fluxo de Caixa nas datas previstas.

Regras tributárias não devem ficar espalhadas em fórmulas hard-coded sem vigência.

---

# 24. Modelo de dados - coleções principais

Coleções relevantes existentes ou previstas no núcleo atual:

| Coleção | Finalidade resumida |
|---|---|
| `usuarios` | usuários e escopo |
| `perfisAcesso` | permissões |
| `gruposEmpresariais` | grupos |
| `empresas` | empresas |
| `contratos` | contratos |
| `planoContasGerencial` | árvore de contas |
| `centrosCusto` | centros e contas permitidas |
| `premissasPlanejamento` | premissas operacionais/financeiras |
| `realizadoMensal` | realizado por Empresa × CC × Conta × Ano |
| `budgetLinhas` | orçamento e controle técnico de ciclos |
| `forecastLinhas` | forecast |
| `planejamentoDetalhes` | sublinhas/memórias Budget/Forecast |
| `contasBancarias` | contas financeiras |
| `fluxoCaixaLancamentos` | lançamentos de caixa |
| `fluxoCaixaFixos` | compromissos recorrentes |
| `prestacaoContas` | prestações |
| `prestacaoComentarios` | explicações/comentários |
| `fechamentoTarefas` | checklist de fechamento |
| `fechamentosMensais` | estado de fechamento |
| `planosAcao` | ações |
| `permutas` | acordos de permuta |
| `permutaMovimentos` | razão da permuta |

Antes de utilizar uma coleção nova, conferir se existe regra correspondente no Firestore.

---

# 25. Compatibilidade e migrações

## 25.1 Princípio

Novas versões devem assumir que dados antigos já existem.

Nunca alterar formato de um documento e simplesmente esperar que toda a base já esteja no formato novo.

Usar estratégias como:

- default compatível na leitura;
- criação de campo novo sem destruir o antigo;
- migração controlada;
- documento canônico;
- flag de `legadoArquivado` / `duplicadoArquivado` quando apropriado;
- scripts/migrações idempotentes;
- possibilidade de rollback.

## 25.2 Exemplo Estatística Manual/Automática

Campo novo aprovado:

```text
modoPreenchimentoEstatistico: "manual" | "automatico"
```

Compatibilidade:

```text
campo ausente => tratar como "manual"
```

Isso impede que uma atualização bloqueie contas estatísticas antigas de forma inesperada.

---

# 26. Versionamento e publicação

## 26.1 Fluxo recomendado

1. criar branch a partir da `main`;
2. implementar mudança;
3. atualizar testes;
4. validar sintaxe;
5. validar imports dinâmicos em Chrome headless;
6. validar Rules quando houver persistência;
7. atualizar documentação se houver mudança estrutural;
8. comparar branch com `main`;
9. promover por fast-forward quando possível;
10. acompanhar QA do `main`;
11. acompanhar deploy da hospedagem;
12. testar em produção com `Ctrl+F5` quando cache puder interferir.

## 26.2 Quality Check

O projeto possui GitHub Actions para:

- `node --check` nos módulos JavaScript;
- contratos arquiteturais simples por `grep`;
- smoke test do site em Chrome headless;
- importação de módulos dinâmicos da Controladoria.

Não considerar uma entrega pronta apenas porque o commit foi aceito pelo GitHub.

---

# 27. Migração para repositório privado

O código pode sair de um repositório público sem afetar o Firestore.

Recomendação:

1. manter Git como fonte de versionamento;
2. tornar o repositório privado ou criar um novo repositório privado;
3. preservar histórico de commits/tags;
4. revisar arquivos em busca de segredos antes da privatização/migração;
5. configurar o novo provedor de deploy para ler o repositório privado;
6. manter o mesmo Firebase durante a migração, salvo decisão específica de migrar dados.

Privar o Git não é mecanismo de segurança do banco; Firestore Rules continuam obrigatórias.

---

# 28. Hospedagem paga e domínio próprio

Uma evolução típica pode ser:

```text
Git privado
   -> CI/CD
   -> Host de frontend
   -> domínio próprio
   -> Firebase Auth + Firestore existentes
```

Opções possíveis incluem Firebase Hosting, Vercel, Netlify, Cloudflare Pages ou infraestrutura equivalente.

## 28.1 Troca de host sem perder dados

Procedimento conceitual:

1. gerar/deployar a mesma aplicação no novo host;
2. manter configuração apontando para o mesmo projeto Firebase;
3. adicionar novo domínio à configuração autorizada do Firebase Authentication quando necessário;
4. testar login e Rules no novo domínio;
5. configurar DNS do domínio próprio;
6. testar HTTPS;
7. manter GitHub Pages temporariamente como fallback até validar;
8. retirar o host antigo somente após aceite.

Nenhum desses passos exige zerar a base do Firestore.

## 28.2 Futuro backend

Funcionalidades como IA com chave secreta, migrações administrativas, integrações server-to-server ou automações sensíveis exigirão backend confiável, por exemplo Cloud Functions/Cloud Run ou serviço equivalente.

Nunca colocar segredo da IA no JavaScript do navegador.

---

# 29. Backup e recuperação

Antes de tornar o SIG crítico para operação real, instituir política de backup.

Recomendação mínima:

- exportação periódica do Firestore quando o plano/infra permitir;
- cópia dos documentos/anexos relevantes;
- tags/releases do código;
- registro de migrações;
- procedimento testado de restauração;
- ambiente de homologação antes de mudanças destrutivas.

**Backup não é apenas baixar o código.** Código e dados são ativos diferentes.

---

# 30. Anexos e Google Drive

Estratégia atual: Drive temporário, referência no Firestore.

Formato conceitual:

```text
anexos: [{
  id,
  provider,
  nome,
  mimeType,
  tamanho,
  url,
  driveFileId,
  storagePath,
  categoria,
  enviadoPor,
  enviadoEm
}]
```

O modelo deve permitir futura migração `google_drive -> firebase_storage` sem reescrever toda a lógica dos módulos.

---

# 31. Performance

A Controladoria é pesada.

Diretrizes:

- submenu expansível;
- módulo só consulta base quando é aberto/atualizado;
- evitar listeners e MutationObservers duplicados;
- evitar múltiplas consultas iguais por renderização;
- evitar carregar todos os módulos pesados no bootstrap;
- preferir motor compartilhado quando Budget e Forecast têm mesma regra;
- geração idempotente em processos recorrentes;
- cache deve ser invalidado de forma previsível após release.

---

# 32. Roadmap aprovado

## Próximos/refinamentos

- flag Manual/Automático nas contas estatísticas;
- construtor seguro de fórmulas para indicadores calculados;
- melhoria profunda da Prestação de Contas;
- motor tributário e planejamento tributário;
- aprovação genérica;
- agenda corporativa/SLA/notificações;
- diário de decisões;
- pesquisa global/Ctrl+K;
- timeline por entidade;
- CAPEX/Committed Budget/What-if;
- riscos e controles mais completos;
- metas de KPI;
- Board Mode/Board Pack;
- IA de apoio a Budget/Forecast/Prestação, sempre com aceitar/editar/descartar e nunca autosave.

## Princípio de IA

IA sugere. Usuário aprova. Nada crítico deve ser persistido automaticamente apenas porque uma IA gerou conteúdo.

---

# 33. Dívida técnica e cuidados conhecidos

- Podem existir arquivos de versões antigas no repositório. A rota atual deve ser conferida antes de apagar qualquer arquivo.
- Não reativar módulos operacionais antigos acidentalmente.
- Manter DRE/Input/Budget/Forecast coerentes com a mesma árvore de contas.
- Prestação de Contas ainda precisa ganhar profundidade executiva/industrial.
- Fórmulas estatísticas automáticas ainda precisam de motor formal.
- Mudanças em filtros globais podem gerar cargas pesadas se dispararem consultas automáticas em todos os módulos.

---

# 34. Checklist obrigatório para qualquer atualização estrutural

Antes de concluir uma versão, responder SIM para:

- O código novo preserva dados existentes?
- A alteração respeita Grupo/Empresa/permissões?
- Sintéticas continuam sem lançamento?
- Estatísticas continuam separadas do resultado financeiro?
- Duplicidades não são somadas silenciosamente?
- Budget/Forecast/DRE continuam coerentes entre si?
- Fechamentos continuam protegendo lançamentos?
- Firestore Rules suportam a nova gravação?
- QA passou em sintaxe e navegador?
- A documentação foi atualizada?
- Existe forma de voltar para a versão anterior sem apagar a base?

---

# 35. Protocolo para uma nova IA/equipe

Ao assumir o SIG:

1. trate este documento como contrato funcional inicial;
2. leia `AGENTS.md` na raiz;
3. leia `docs/SIG-MANUAL-MESTRE.md`;
4. leia `app.js` para descobrir o escopo ativo;
5. leia `js/controllership-router.js` para descobrir as versões vigentes da Controladoria;
6. leia `firestore.rules` antes de mexer em dados/permissões;
7. confira o workflow `.github/workflows/js-check.yml`;
8. nunca baseie alteração apenas no nome de um arquivo `vN`; confira a rota;
9. registre decisões estruturais neste dossiê;
10. não assuma que código antigo no repo ainda faz parte do produto ativo.

---

# 36. Regra de manutenção deste dossiê

Este documento faz parte do produto.

Mudanças que obrigatoriamente exigem atualização deste arquivo:

- novo módulo;
- remoção de módulo;
- alteração de hierarquia de contas;
- mudança de contexto global;
- mudança na identidade de documentos/canonicalização;
- nova coleção relevante;
- nova regra de fechamento;
- novo ciclo de Budget/Forecast;
- alteração de estratégia de hospedagem;
- mudança de Firebase/projeto de dados;
- mudança de estratégia de anexos;
- decisão arquitetural de segurança;
- novo motor automático relevante.

**Se o código evoluir e este documento não evoluir, a entrega está incompleta.**
