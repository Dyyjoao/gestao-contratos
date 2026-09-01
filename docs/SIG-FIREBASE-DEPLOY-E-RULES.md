# SIG — Firebase, Deploy e Rules

**Baseline:** 01/09/2026  
**Projeto Firebase:** `gestao-de-contratos-b266b`

Este documento é a fonte operacional para distinguir o deploy do frontend do deploy do backend gerenciado do SIG.

## 1. Dois deploys independentes

O SIG usa hoje:

- **GitHub Pages** para HTML, CSS e JavaScript;
- **Firebase Authentication** para autenticação;
- **Cloud Firestore** para os dados;
- **Firebase Storage** para anexos suportados pelas regras.

Promover a branch para `main` e concluir o GitHub Pages **não publica automaticamente**:

- `firestore.rules`;
- `storage.rules`;
- índices do Firestore;
- configurações administrativas do projeto Firebase.

Por isso uma versão pode ter frontend novo e backend ainda com Rules antigas. Essa situação deve ser tratada como release incompleta.

## 2. Contrato de configuração no repositório

A raiz do repositório contém:

- `.firebaserc` — identifica o projeto Firebase de destino;
- `firebase.json` — declara quais arquivos de Rules pertencem ao projeto;
- `firestore.rules` — autorização do Cloud Firestore;
- `storage.rules` — autorização do Firebase Storage.

A configuração atual aponta para:

`gestao-de-contratos-b266b`

Não colocar tokens, service accounts, chaves privadas ou credenciais administrativas nesses arquivos.

## 3. Nova versão de Controladoria — dependência de backend

A versão consolidada de 31/08–01/09/2026 introduziu a coleção:

`imobilizados`

Ela é usada por:

- Imobilizado & CAPEX;
- Balanço Patrimonial;
- Input Mensal no bloco patrimonial;
- Budget;
- Forecast;
- DRE em cenários projetados;
- validação de inativação do Plano de Contas.

A regra correspondente em `firestore.rules` exige:

- usuário com acesso de visualização à Controladoria para leitura;
- `controladoria.imobilizado` ou administração FP&A para criar/alterar;
- mesmo grupo empresarial;
- empresa acessível pelo usuário;
- preservação de `grupoId` e `empresaId` em updates;
- exclusão direta desabilitada.

## 4. Falha fechada em integrações contábeis

A partir desta baseline, a indisponibilidade da coleção `imobilizados` não pode ser interpretada como “nenhum bem cadastrado”.

Motivo: um erro de permissão convertido silenciosamente em lista vazia poderia:

- retirar depreciação do Budget/Forecast;
- retirar depreciação da DRE projetada;
- retirar integração automática do Balanço;
- liberar digitação manual no Input em contas que deveriam ser automáticas;
- permitir inativação de conta ainda vinculada a bem/CAPEX.

O núcleo de dados registra falhas de coleção e os motores automáticos devem **falhar de forma fechada**. Em dúvida, o SIG bloqueia o cálculo/ação em vez de assumir zero.

## 5. Como publicar as Rules

Pré-requisitos:

1. Firebase CLI instalada;
2. usuário autenticado e autorizado no projeto;
3. revisão do diff de `firestore.rules` e `storage.rules`;
4. execução a partir da raiz do repositório.

Comando de publicação:

```bash
firebase deploy --only firestore:rules,storage
```

Depois do deploy:

1. abrir o SIG publicado;
2. autenticar normalmente;
3. selecionar uma única empresa;
4. abrir Imobilizado & CAPEX;
5. confirmar que Plano de Contas e Centros de Custo são carregados;
6. cadastrar ou editar um bem de teste controlado;
7. validar a integração no Balanço e no planejamento;
8. remover ou regularizar o dado de teste conforme procedimento da empresa.

## 6. Diagnóstico de `permission-denied`

Se uma tela nova abrir, mas apresentar erro ao consultar uma coleção:

1. confirmar se a regra existe no **repositório**;
2. confirmar se a regra foi **publicada no Firebase**;
3. conferir perfil e permissões do usuário;
4. conferir `grupoId` e `empresaId` dos documentos;
5. conferir se o usuário possui acesso à empresa selecionada;
6. somente depois investigar índices ou erro de frontend.

Regra existente no Git não prova que ela está ativa no Firebase.

## 7. Matriz da versão 01/09/2026

| Recurso | Coleção / backend | Nova nesta versão? | Rule adicional? |
| --- | --- | --- | --- |
| Plano v5 / natureza / multiplicadores | `planoContasGerencial` | novos campos | não; rule existente continua compatível |
| Balanço Patrimonial | `realizadoMensal` + `imobilizados` | módulo novo | `imobilizados` sim |
| Input patrimonial | `realizadoMensal` + `imobilizados` | fluxo novo | `imobilizados` sim |
| Budget | `budgetLinhas`, `planejamentoDetalhes`, `premissasPlanejamento`, `imobilizados` | motor evoluído | somente `imobilizados` |
| Forecast | `forecastLinhas`, `planejamentoDetalhes`, `premissasPlanejamento`, `realizadoMensal`, `imobilizados` | motor evoluído | somente `imobilizados` |
| DRE projetada | Budget/Forecast + `imobilizados` | integração nova | somente `imobilizados` |
| Imobilizado & CAPEX | `imobilizados` | coleção nova | sim |
| Vigência de premissas | `premissasPlanejamento` | campos/lógica novos | não |
| Consolidação DRE por código | bases existentes | lógica nova | não |
| Dashboard / Prestação | bases existentes | lógica compartilhada | não |

## 8. Storage

Nenhum anexo específico do Imobilizado/CAPEX foi introduzido nesta release. Portanto `storage.rules` não precisou de regra nova para o módulo.

Se futuramente forem adicionados notas fiscais, laudos, fotos ou termos de baixa ao Imobilizado, revisar previamente a granularidade da permissão de escrita. Hoje o módulo `controladoria` no Storage usa autorização geral de Controladoria para gravação, e isso não deve ser presumido como suficiente para uma futura função de anexos patrimoniais.

## 9. Regra para futuras versões

Toda feature que criar coleção, subcoleção, caminho de Storage ou nova ação de permissão deve incluir no mesmo pacote:

1. código da feature;
2. Rules correspondentes;
3. contrato de deploy;
4. QA de autorização;
5. documentação;
6. plano de rollback.

Frontend novo com Rules antigas é um estado inválido de produção.
