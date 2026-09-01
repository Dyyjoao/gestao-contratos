# SIG — Firebase, Deploy e Rules

**Baseline:** 01/09/2026 — Plano de Contas v6 + Consórcios v1  
**Projeto Firebase:** `gestao-de-contratos-b266b`

Este documento distingue o deploy do frontend do deploy do backend gerenciado do SIG.

## 1. Dois deploys independentes

O SIG usa:

- GitHub Pages para HTML/CSS/JavaScript;
- Firebase Authentication;
- Cloud Firestore;
- Firebase Storage.

Promover `main` e concluir GitHub Pages **não publica automaticamente**:

- `firestore.rules`;
- `storage.rules`;
- índices/configurações administrativas Firebase.

Uma versão com frontend novo e Rule antiga é release incompleta.

## 2. Contrato do repositório

- `.firebaserc` — projeto Firebase de destino;
- `firebase.json` — aponta para arquivos de Rules;
- `firestore.rules` — autorização Firestore;
- `storage.rules` — autorização Storage;
- `.github/workflows/firebase-contract-check.yml` — valida o contrato mínimo.

Projeto esperado: `gestao-de-contratos-b266b`.

## 3. Rules críticas atuais

### 3.1 Imobilizado

A coleção `imobilizados` exige:

- leitura: permissão de visualização da Controladoria + documento acessível;
- create/update: `fpaImobilizado()` + isolamento Grupo/Empresa;
- delete: não permitido pela Rule atual.

A integração contábil depende dessa coleção e deve operar fail-closed em falha de leitura.

### 3.2 Plano de Contas v6

A coleção `planoContasGerencial` mantém:

- read: visualização da Controladoria + documento acessível;
- create/update: `fpaPlano()` + documento acessível;
- delete: `fpaPlano()` + documento acessível.

O delete existe para limpeza de cadastro de teste/erro. O frontend verifica referências antes da exclusão. Com uso/histórico, a conta deve ser inativada.

### 3.3 Consórcios v1

A coleção `consorcios` possui autorização própria:

- read: `consorciosVisualizar()`, que aceita Administração FP&A, `controladoria.consorciosVisualizar` ou `controladoria.consorciosEditar`;
- create/update: `consorciosEditar()`, que aceita Administração FP&A ou `controladoria.consorciosEditar`;
- Grupo/Empresa permanecem imutáveis em update;
- delete: bloqueado.

A tela também esconde ações de edição para perfil somente consulta, mas a Rule é a barreira de autorização efetiva.

Consórcios v1 não depende de acesso às coleções contábeis para calcular sua carteira e não deve gerar lançamentos em outras bases.

## 4. Publicação desta versão

Depois de promover uma versão que altere `firestore.rules` para `main`, publicar as Rules completas.

Firebase CLI autenticado:

```bash
firebase deploy --only firestore:rules,storage
```

Se a publicação for manual:

1. abrir Firebase Console;
2. selecionar `gestao-de-contratos-b266b`;
3. abrir Firestore Database;
4. abrir aba **Regras**;
5. substituir pelo conteúdo integral de `firestore.rules` da mesma versão da `main`;
6. publicar;
7. testar autenticado.

Para Storage, publicar `storage.rules` se ela também tiver sido alterada.

Nunca misturar Rule antiga com frontend novo ou publicar apenas um bloco isolado sem o arquivo completo.

## 5. Diagnóstico rápido

### `permission-denied` em Imobilizado

Verificar Rule `match /imobilizados/{id}`, permissão de Controladoria, Grupo/Empresa e acesso do usuário.

### `permission-denied` ao excluir conta de teste

Verificar Rule da v6, `controladoria.editar`/`controladoria.planoContas`, escopo do documento e se o frontend não bloqueou por referência.

### `permission-denied` em Consórcios

Verificar:

- Rule `match /consorcios/{id}` publicada;
- `consorciosVisualizar` para consulta ou `consorciosEditar` para gestão;
- `grupoId` / `empresaId` do documento;
- empresa dentro do acesso do usuário;
- ao criar, exatamente uma empresa selecionada no cabeçalho.

### Frontend atualizado, comportamento de Rule antigo

Isso ocorre quando apenas GitHub Pages foi publicado. Confirmar a versão ativa das Rules no Firebase e republicar o arquivo completo.

## 6. QA de contrato

`SIG Firebase Contract Check` deve falhar se:

- `firebase.json` / `.firebaserc` sumirem ou divergirem;
- a Rule de Imobilizado desaparecer;
- a Rule de delete seguro do Plano v6 desaparecer;
- a Rule/permissões de Consórcios desaparecerem;
- o módulo Consórcios deixar de usar a coleção esperada;
- o Plano ativo deixar de fazer checagem de referências;
- documentação deixar de registrar que Pages e Rules têm deploy independente.

`SIG Consorcios Contract Check` valida também rota, permissões, matemática básica e abertura real da tela.

## 7. Segurança

Rules são a barreira efetiva de autorização. Botões, filtros e confirmações são proteção adicional de negócio, não substitutos das Rules.

Não colocar Service Account, token administrativo ou segredo no frontend/repositório.