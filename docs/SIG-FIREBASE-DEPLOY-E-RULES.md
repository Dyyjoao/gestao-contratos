# SIG — Firebase, Deploy e Rules

**Baseline:** 16/09/2026  
**Projeto Firebase:** `gestao-de-contratos-b266b`

## 1. Arquitetura vigente

O SIG usa atualmente:
- frontend Web/PWA;
- Firebase Authentication;
- Cloud Firestore;
- GitHub Pages para hospedagem do frontend.

Firebase Storage permanece **adiado/não ativo para a operação atual**. Não considerar Storage publicado ou disponível sem ativação e Rules confirmadas.

Banco local, API própria, VPN obrigatória e domínio multi-tenant são opções futuras em avaliação e não substituem a arquitetura vigente sem decisão explícita.

## 2. Deploys independentes

GitHub Pages não publica:
- `firestore.rules`;
- `storage.rules`;
- configurações administrativas do Firebase.

Sempre que `firestore.rules` mudar, a release só termina depois da publicação da Rule completa correspondente ao mesmo HEAD.

Se frontend mudar e Rules não mudarem, registrar explicitamente que **não há republicação de Rules**.

## 3. Arquivos de contrato

- `.firebaserc`;
- `firebase.json`;
- `firestore.rules`;
- `storage.rules`;
- `.github/workflows/firebase-contract-check.yml`.

## 4. Segurança obrigatória

- Auth identifica; Rules autorizam;
- Grupo e Empresa são fronteiras de segurança;
- `grupoId`/`empresaId` não podem ser trocados em update fora das regras do módulo;
- botões escondidos não substituem backend;
- segredo, token, certificado ou Service Account nunca vai para JavaScript público;
- `auditoriaAdministrativa` é append-only.

## 5. Rules por módulos relevantes

A baseline vigente possui regras próprias para, entre outros:
- Contratos;
- Frota;
- Vendedores/Vendas;
- Plano de Contas;
- Imobilizado;
- Consórcios;
- Permutas;
- Budget/Forecast;
- Fluxo de Caixa;
- Contas a Pagar;
- Governança/Planos de Ação.

### Contratos
Permissões continuam em `contratos.*`, mesmo com o item aparecendo dentro de Controladoria na navegação.

### Contas a Pagar
Permissões continuam em `contasPagar.*`. A posição visual dentro de Controladoria não autoriza transformar a Rule em `controladoria.*`.

### Permutas e Consórcios
Continuam com regras e permissões próprias/compatíveis já existentes. A mudança de menu não altera persistência.

### Produção
A migração de Produção está em homologação no PR #30. **Não existe Rule de Produção aprovada/publicada na baseline produtiva.** Não usar dados reais de Produção até a tela ser homologada e o pacote de Rules correspondente ser fechado/publicado.

## 6. Publicação manual de Firestore Rules

Quando houver alteração aprovada:
1. abrir Firebase Console;
2. selecionar `gestao-de-contratos-b266b`;
3. Firestore Database → Regras;
4. substituir pelo conteúdo integral de `firestore.rules` do HEAD aprovado;
5. publicar;
6. testar com perfil autorizado e não autorizado.

CLI, quando somente Firestore Rules mudarem:

```bash
firebase deploy --only firestore:rules
```

Quando Firestore e Storage Rules mudarem juntas e o Storage estiver efetivamente em uso:

```bash
firebase deploy --only firestore:rules,storage
```

Storage só deve ser incluído quando o recurso for efetivamente ativado e a Rule tiver sido aprovada.

## 7. Preview

A política do projeto é preview-first. O objetivo é usar canal isolado por PR, preferencialmente Firebase Hosting Preview Channels, para homologação sem merge em `main`.

A esteira de preview navegável ainda precisa ser concluída. Enquanto isso, não usar `main` como ambiente temporário de teste.

## 8. Regras de release

Para qualquer pacote que altere backend:
- CI verde;
- preview/homologação quando aplicável;
- confirmação da Rule que mudou;
- publicação da Rule completa;
- teste autenticado;
- confirmação explícita no handoff.

Nunca misturar Rule de um commit com frontend de outro.

## 9. Storage

Decisão vigente:
- ativação adiada;
- custom Storage Rules não confirmadas como publicadas;
- branch histórica `feature/firebase-storage-contratos-futuro` preserva implementação futura;
- quando retomado, portar apenas os arquivos de Storage para branch nova baseada na `main` vigente; não fazer merge wholesale da branch antiga.

## 10. App Check, MFA e hardening

App Check/MFA podem fazer parte do hardening corporativo futuro, mas qualquer ativação deve ser implementada e testada explicitamente. Não documentar como recurso ativo antes da configuração real.