# SIG — Política de Segurança

Este documento define as regras mínimas de segurança do **SIG — Sistema Integrado de Gestão**.

**Baseline:** 01/09/2026 — Plano de Contas v6 + Consórcios v1.

---

## 1. Princípios

1. **Autenticação não é autorização.** Estar logado não significa poder ler ou alterar qualquer dado.
2. **Interface não é barreira de segurança.** Botão oculto não substitui `firestore.rules`.
3. **Isolamento de Grupo e Empresa é obrigatório.**
4. **Menor privilégio.** Usuários recebem somente permissões necessárias.
5. **Sem segredos no frontend.**
6. **Mudança estrutural exige revisão de Rules.**
7. **Rule versionada não significa Rule publicada.** GitHub Pages não publica Firebase Rules.
8. **Dados não são corrigidos para compensar bug visual.**
9. **Base crítica indisponível não é base vazia.** Cálculo dependente deve falhar de forma fechada.
10. **Histórico empresarial é preservado.** Exclusão física só é admitida onde houver regra explícita e justificativa funcional.

---

## 2. Autenticação

O SIG utiliza Firebase Authentication.

Requisitos:

- usuário autenticado;
- documento correspondente em `usuarios`;
- usuário ativo;
- perfil existente e ativo;
- domínio autorizado revisado quando hospedagem mudar;
- persistência de sessão conforme núcleo aprovado.

---

## 3. Autorização e segregação

A autorização efetiva é aplicada por `firestore.rules` e considera:

- `grupoId`;
- empresa principal;
- `empresasAcesso`;
- acesso global explicitamente autorizado;
- perfil e permissões por módulo/ação;
- `grupoId` e `empresaId` do documento.

Uma atualização nunca deve permitir:

- leitura cruzada entre grupos;
- acesso a empresa não autorizada;
- troca de `grupoId`/`empresaId` em update para escapar do escopo;
- autoelevação de perfil comum para administrador;
- bypass de autorização por chamada direta ao Firestore.

---

## 4. Segredos e credenciais

Nunca commitar ou expor no frontend:

- Service Account JSON;
- private keys;
- senhas;
- refresh tokens administrativos;
- tokens pessoais do GitHub;
- segredos de API;
- credenciais de banco;
- chaves backend com poder administrativo.

A configuração pública do Firebase Web App não substitui Security Rules.

---

## 5. Firestore

### 5.1 Regra geral

Documentos empresariais devem permanecer no mesmo Grupo/Empresa durante update. Create deve validar o contexto e delete deve ser explicitamente autorizado por coleção.

### 5.2 Imobilizado

`imobilizados`:

- read: visualização da Controladoria + documento acessível;
- create/update: `fpaImobilizado()` + escopo;
- delete: bloqueado.

Consumidores contábeis devem tratar falha da coleção como erro crítico, não como `[]`.

### 5.3 Plano de Contas v6

`planoContasGerencial`:

- read: visualização da Controladoria + documento acessível;
- create/update: `fpaPlano()` + documento acessível;
- delete: `fpaPlano()` + documento acessível.

A permissão de delete existe para limpar cadastro incorreto/teste. Ela não autoriza apagar histórico empresarial indiscriminadamente.

O frontend `ctrl-chart-accounts-v6.js` deve verificar referências antes do delete. Se houver vínculo, a conta deve ser inativada.

### 5.4 Consórcios v1

`consorcios`:

- read: `consorciosVisualizar()` + documento acessível;
- create/update: `consorciosEditar()` + documento acessível;
- `grupoId` e `empresaId` não podem ser trocados em update;
- delete: bloqueado.

`consorciosVisualizar()` aceita Administração FP&A, `controladoria.consorciosVisualizar` ou `controladoria.consorciosEditar`. `consorciosEditar()` aceita Administração FP&A ou `controladoria.consorciosEditar`.

A tela pode ocultar ações de edição, mas isso é somente UX; a Rule continua sendo a barreira efetiva.

Consórcios v1 é gerencial e independente: não deve criar lançamentos em coleções contábeis/planejamento como efeito colateral.

---

## 6. Plano de Contas e integridade contábil

Máscara v6: `#.##.##.####`.

- Raiz → Sintética N1 → Sintética N2 → Analítica;
- somente Analíticas recebem lançamentos;
- natureza e multiplicadores são centralizados em `js/account-mask.js`;
- saldo persistido permanece bruto;
- redutora é determinada por natureza oposta à raiz;
- inativação preserva histórico por exercício;
- reativação remove inativação programada;
- contas antigas não devem ser migradas/destruídas implicitamente.

---

## 7. Storage

`storage.rules` é independente de `firestore.rules`.

Todo novo caminho de upload deve definir quem lê, quem grava, vínculo com Grupo/Empresa e limites quando necessários.

Não presumir que permissão de Firestore automaticamente vale no Storage.

---

## 8. Deploy seguro

Uma release pode envolver dois ciclos:

1. frontend → GitHub Pages;
2. Rules → Firebase.

Quando `firestore.rules` ou `storage.rules` forem alteradas:

- versionar Rule completa;
- passar `SIG Firebase Contract Check`;
- promover frontend compatível;
- publicar Rules no Firebase;
- testar com usuário autenticado e permissões reais.

Para a baseline com Consórcios v1, o módulo só estará funcional para usuários reais depois da Rule de `consorcios` estar publicada no Firebase.

---

## 9. QA de segurança

Antes de release estrutural:

- [ ] usuário sem acesso à empresa continua bloqueado;
- [ ] usuário sem permissão de Plano não consegue criar/editar/excluir conta;
- [ ] conta com referência não é excluída pela aplicação;
- [ ] Grupo/Empresa permanecem imutáveis em update;
- [ ] Imobilizado falha fechado se a Rule estiver ausente;
- [ ] usuário sem permissão de Consórcios não lê a coleção;
- [ ] usuário apenas com `consorciosVisualizar` não grava a coleção;
- [ ] usuário com `consorciosEditar` grava somente em empresa acessível;
- [ ] delete de Consórcios permanece bloqueado;
- [ ] Rules ativas no Firebase correspondem à versão do frontend;
- [ ] nenhum segredo foi adicionado ao repositório.

---

## 10. Resposta a incidente

Se uma Rule permissiva for publicada indevidamente:

1. interromper operações de escrita de risco;
2. restaurar Rule conhecida e segura;
3. republicar no Firebase;
4. revisar logs/dados afetados quando disponíveis;
5. corrigir frontend/QA que permitiu a regressão;
6. registrar a decisão nos documentos de continuidade.

Nunca corrigir incidente de autorização apagando dados em massa sem análise de dependências e backup/rollback.