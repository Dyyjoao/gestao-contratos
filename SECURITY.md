# SIG — Política de Segurança

Este documento define as regras mínimas de segurança do **SIG — Sistema Integrado de Gestão**.

A segurança do sistema deve ser tratada como parte da arquitetura e não como acabamento de interface.

**Baseline:** 01/09/2026.

---

## 1. Princípios

1. **Autenticação não é autorização.** Estar logado não significa poder ler ou alterar qualquer dado.
2. **Interface não é barreira de segurança.** Botão oculto não substitui `firestore.rules`.
3. **Isolamento de Grupo e Empresa é obrigatório.** Documentos empresariais devem manter `grupoId` e `empresaId` quando aplicável.
4. **Menor privilégio.** Usuários devem receber apenas permissões necessárias à função.
5. **Sem segredos no frontend.** O navegador é ambiente não confiável para credenciais administrativas.
6. **Mudança estrutural exige revisão de Rules.** Nova coleção ou novo fluxo de escrita não pode ser publicado sem regra correspondente.
7. **Rule versionada não significa Rule publicada.** O deploy do GitHub Pages não publica Firestore/Storage Rules.
8. **Dados não são corrigidos para compensar bug visual.** Primeiro corrigir código/regra; só depois avaliar migração de dados.
9. **Base crítica indisponível não é base vazia.** Cálculo financeiro dependente deve falhar de forma fechada.

---

## 2. Autenticação

O SIG utiliza Firebase Authentication.

Requisitos:

- somente usuários autenticados podem alcançar dados protegidos;
- usuário deve existir na coleção `usuarios`;
- usuário deve estar ativo;
- perfil de acesso deve existir e estar ativo;
- domínios autorizados no Firebase Authentication devem ser revisados quando a hospedagem ou domínio mudar;
- sessão e persistência devem seguir a configuração aprovada no núcleo do sistema.

---

## 3. Autorização e segregação

A autorização efetiva é aplicada por `firestore.rules`.

O modelo vigente considera:

- `grupoId` do usuário;
- empresa principal;
- `empresasAcesso`;
- acesso global quando explicitamente autorizado;
- perfil e permissões por módulo/ação;
- `grupoId` e `empresaId` do documento.

### 3.1 Invariantes

Uma atualização nunca deve permitir silenciosamente:

- usuário de um grupo ler dados de outro grupo;
- usuário sem acesso a uma empresa consultar ou alterar seus documentos;
- troca de `grupoId`/`empresaId` em update para escapar do escopo original;
- perfil comum atribuir a si mesmo acesso administrativo;
- frontend contornar restrição apenas chamando Firestore diretamente.

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
- chaves de serviços backend com poder administrativo.

A configuração pública de um Firebase Web App não equivale a uma Service Account e precisa existir no cliente, mas isso **não dispensa**:

- Security Rules corretas;
- restrições de chave quando aplicáveis no Google Cloud;
- controle de domínios autorizados;
- App Check quando adotado;
- monitoramento de uso e cotas.

`.firebaserc` e `firebase.json` podem ser versionados porque descrevem o projeto/arquivos de deploy, não credenciais administrativas.

---

## 5. Firestore Rules

`firestore.rules` é parte do contrato arquitetural.

Antes de criar uma coleção nova:

1. definir quem pode ler;
2. definir quem pode criar;
3. definir quem pode alterar;
4. definir campos que não podem mudar após criação;
5. decidir se delete é permitido — padrão do SIG é **não permitir delete** em registros críticos;
6. garantir segregação de Grupo/Empresa;
7. testar perfil autorizado e não autorizado;
8. publicar a Rule no Firebase antes de considerar a release encerrada.

Coleções de histórico, movimentos, fechamentos e trilhas devem privilegiar imutabilidade ou alterações restritas.

### 5.1 Imobilizado/CAPEX

A coleção `imobilizados` foi introduzida na consolidação de 31/08–01/09/2026.

A Rule deve garantir:

- leitura apenas com visualização da Controladoria e documento acessível;
- criação/edição apenas com permissão adequada de Imobilizado/FP&A;
- isolamento de Grupo/Empresa;
- `grupoId` e `empresaId` preservados no update;
- delete direto desabilitado.

A coleção é dependência crítica para Balanço, Input patrimonial, Budget, Forecast, DRE projetada e validação de inativação do Plano de Contas.

---

## 6. Deploy de Rules

O contrato do projeto Firebase fica em:

- `.firebaserc`;
- `firebase.json`;
- `firestore.rules`;
- `storage.rules`.

Projeto atual: `gestao-de-contratos-b266b`.

**GitHub Pages não publica esses arquivos no Firebase.**

Quando Rules mudarem, o release exige uma etapa autenticada separada. O procedimento operacional está em `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`.

Comando atualmente documentado:

```bash
firebase deploy --only firestore:rules,storage
```

O comando só deve ser executado com usuário autorizado. Nunca colocar credenciais de deploy no código cliente ou no repositório.

---

## 7. Storage e anexos

`storage.rules` deve ser revisado antes de migrar/adicionar anexos.

Enquanto Google Drive for usado como referência de anexos:

- o Firestore deve guardar apenas metadados/referências necessárias;
- permissões do arquivo no Drive continuam sendo responsabilidade do Drive;
- não assumir que ter a URL significa ter autorização adequada;
- não armazenar token OAuth ou credencial do Drive no documento empresarial.

Ao ativar Firebase Storage, o caminho do arquivo deve permitir validar Grupo/Empresa e evitar escrita fora do escopo autorizado.

A baseline atual não adiciona anexos específicos ao Imobilizado/CAPEX. Se essa função for criada, revisar a granularidade da permissão de Storage antes da implementação.

---

## 8. Frontend e código cliente

O frontend do SIG é público para o navegador mesmo quando o repositório for privado.

Portanto:

- nunca implementar segurança baseada em segredo JavaScript;
- não confiar em campos enviados pelo cliente sem Rules;
- sanitizar conteúdo usado em HTML;
- preferir funções comuns de escape já existentes;
- validar identificadores e contexto antes de gravar;
- evitar URLs `javascript:` ou HTML arbitrário vindo de dados;
- dependências de CDN devem usar versões fixadas quando possível.

---

## 9. Integridade financeira e fail-closed

Integridade de cálculo também é requisito de segurança operacional.

A natureza contábil e os multiplicadores ficam centralizados em `js/account-mask.js`.

Regras:

- saldo bruto persistido não deve ser multiplicado e sobrescrito para ajustar relatório;
- conta redutora é definida por natureza oposta à natureza padrão da raiz;
- Estatística não compõe resultado financeiro;
- Sintética nunca recebe lançamento manual;
- duplicidades não podem ser somadas silenciosamente;
- documento canônico deve prevalecer quando houver legado duplicado;
- Balanço é posição de fechamento, não soma de meses;
- falha de leitura de base automática crítica não pode ser convertida silenciosamente em lista vazia ou zero.

Para `imobilizados`, o núcleo registra falhas de coleção e os motores automáticos bloqueiam cálculos/ações dependentes enquanto a base estiver indisponível.

Isso evita que um `permission-denied`, indisponibilidade de rede ou Rule desatualizada produza um relatório aparentemente válido sem depreciação/ativo automático.

---

## 10. Mudança de hospedagem e domínio

O frontend pode mudar de host sem mover o Firestore.

Antes de trocar GitHub Pages por outro host ou domínio:

- preservar commit/tag estável;
- habilitar HTTPS;
- revisar Firebase Authentication authorized domains;
- revisar CORS/integrações aplicáveis;
- revisar restrições da API key pública;
- testar login e logout;
- testar leitura e escrita com perfil administrador e perfil restrito;
- testar isolamento entre empresas;
- validar console do navegador sem erros de origem/CSP;
- alterar DNS definitivo somente após smoke test.

A troca de host não deve ser confundida com troca de projeto Firebase.

---

## 11. Checklist antes de publicar

Uma release que altera dados ou permissões só pode ser considerada pronta após verificar:

- [ ] nenhuma credencial sensível entrou no diff;
- [ ] `firestore.rules` cobre todas as coleções novas/alteradas;
- [ ] `storage.rules` foi revisado se anexos mudaram;
- [ ] `firebase.json` e `.firebaserc` apontam para o contrato correto;
- [ ] `grupoId` e `empresaId` permanecem protegidos;
- [ ] perfil sem permissão foi testado;
- [ ] operações críticas não dependem apenas de botão oculto;
- [ ] dependências financeiras críticas falham de forma fechada;
- [ ] não existe delete destrutivo novo sem justificativa explícita;
- [ ] migração de dados, se houver, é idempotente e possui rollback;
- [ ] QA de sintaxe e browser passou;
- [ ] QA de contrato Firebase passou;
- [ ] documentação de continuidade foi atualizada;
- [ ] se Rules mudaram, o deploy separado no Firebase foi concluído e testado.

---

## 12. Incidente e recuperação

Se houver suspeita de acesso indevido, exposição de segredo, Rule incompatível ou corrupção de dados:

1. interromper nova publicação;
2. preservar evidências e commits envolvidos;
3. revogar imediatamente a credencial exposta, quando existir;
4. comparar Rules do Git com Rules efetivamente publicadas;
5. revisar logs disponíveis;
6. identificar Grupo/Empresa/documentos afetados;
7. não sobrescrever em massa os dados antes de entender a extensão do problema;
8. corrigir a causa;
9. executar migração/restauração controlada se necessário;
10. documentar o incidente e a correção.

Segredo commitado deve ser considerado comprometido mesmo após apagar o arquivo do commit mais recente; a credencial deve ser rotacionada.

Se a interface abrir mas uma integração automática falhar, não considerar os números derivados confiáveis até confirmar que a coleção crítica voltou a ser lida com sucesso.

---

## 13. Continuidade e revisão

Ler também:

- `AGENTS.md`;
- `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`;
- `docs/SIG-MANUAL-MESTRE.md`;
- `docs/SIG-GUIA-DE-CONTINUIDADE.md`;
- `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`;
- `firestore.rules`;
- `storage.rules`;
- `firebase.json`;
- `.firebaserc`.

Esta política deve ser atualizada quando houver mudança relevante em autenticação, permissões, armazenamento, hospedagem, modelo multiempresa, integrações ou tratamento de dados sensíveis.
