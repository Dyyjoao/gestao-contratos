# SIG — Firebase, Deploy e Rules

**Baseline:** 01/09/2026 — Plano de Contas v6  
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
- **delete: `fpaPlano()` + documento acessível**.

O delete foi habilitado para permitir limpeza de cadastros de teste/erro no Plano v6. Isso **não significa** que qualquer conta pode ser apagada.

Antes do delete, `ctrl-chart-accounts-v6.js` verifica referências em bases financeiras, Premissas, Imobilizado, Centros de Custo e bases legadas relacionadas. Se existir vínculo, a aplicação bloqueia a exclusão.

Regra operacional:

- sem uso → exclusão pode ser confirmada;
- com uso/histórico → inativar, não excluir.

## 4. Publicação desta versão

Depois de promover a versão v6 para `main`, publicar as Rules completas.

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

Verificar:

- Rule `match /imobilizados/{id}` publicada;
- perfil com `controladoria.visualizar`;
- `grupoId` / `empresaId` do documento;
- acesso do usuário à empresa.

### `permission-denied` ao excluir conta de teste

Verificar:

- Rule da v6 publicada;
- usuário com `controladoria.editar` ou `controladoria.planoContas`;
- documento pertence ao Grupo/Empresa acessível;
- frontend realmente chegou ao delete — se houver referência, ele deve bloquear antes da chamada ao Firestore.

### Frontend atualizado, comportamento de Rule antigo

Isso é esperado quando apenas GitHub Pages foi publicado. Confirmar a data/versão ativa das Rules no Firebase e republicar o arquivo completo.

## 6. QA de contrato

`SIG Firebase Contract Check` deve falhar se:

- `firebase.json` / `.firebaserc` sumirem ou divergirem;
- a Rule de Imobilizado desaparecer;
- a Rule de delete seguro do Plano v6 desaparecer;
- o Plano ativo deixar de fazer checagem de referências;
- documentação deixar de registrar que Pages e Rules têm deploy independente.

## 7. Segurança

Rules são a barreira efetiva de autorização. Botões, filtros e confirmações são proteção adicional de negócio, não substitutos das Rules.

Não colocar Service Account, token administrativo ou segredo no frontend/repositório.
