# SIG — Política de Segurança

Este documento define as regras mínimas de segurança do **SIG — Sistema Integrado de Gestão**.

A segurança do sistema deve ser tratada como parte da arquitetura e não como acabamento de interface.

---

## 1. Princípios

1. **Autenticação não é autorização.** Estar logado não significa poder ler ou alterar qualquer dado.
2. **Interface não é barreira de segurança.** Botão oculto não substitui `firestore.rules`.
3. **Isolamento de Grupo e Empresa é obrigatório.** Documentos empresariais devem manter `grupoId` e `empresaId` quando aplicável.
4. **Menor privilégio.** Usuários devem receber apenas permissões necessárias à função.
5. **Sem segredos no frontend.** O navegador é ambiente não confiável para credenciais administrativas.
6. **Mudança estrutural exige revisão de Rules.** Nova coleção ou novo fluxo de escrita não pode ser publicado sem regra correspondente.
7. **Dados não são corrigidos para compensar bug visual.** Primeiro corrigir código/regra; só depois avaliar migração de dados.

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
7. testar perfil autorizado e não autorizado.

Coleções de histórico, movimentos, fechamentos e trilhas devem privilegiar imutabilidade ou alterações restritas.

---

## 6. Storage e anexos

`storage.rules` deve ser revisado antes de migrar anexos para Firebase Storage.

Enquanto Google Drive for usado como referência de anexos:

- o Firestore deve guardar apenas metadados/referências necessárias;
- permissões do arquivo no Drive continuam sendo responsabilidade do Drive;
- não assumir que ter a URL significa ter autorização adequada;
- não armazenar token OAuth ou credencial do Drive no documento empresarial.

Ao ativar Firebase Storage, o caminho do arquivo deve permitir validar Grupo/Empresa e evitar escrita fora do escopo autorizado.

---

## 7. Frontend e código cliente

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

## 8. Natureza contábil e integridade financeira

Integridade de cálculo também é requisito de segurança operacional.

A natureza contábil e os multiplicadores ficam centralizados em `js/account-mask.js`.

Regras:

- saldo bruto persistido não deve ser multiplicado e sobrescrito para ajustar relatório;
- conta redutora é definida por natureza oposta à natureza padrão da raiz;
- Estatística não compõe resultado financeiro;
- Sintética nunca recebe lançamento manual;
- duplicidades não podem ser somadas silenciosamente;
- documento canônico deve prevalecer quando houver legado duplicado;
- Balanço é posição de fechamento, não soma de meses.

Essas regras reduzem risco de corrupção silenciosa de informação gerencial.

---

## 9. Mudança de hospedagem e domínio

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

---

## 10. Checklist antes de publicar

Uma release que altera dados ou permissões só pode ser considerada pronta após verificar:

- [ ] nenhuma credencial sensível entrou no diff;
- [ ] `firestore.rules` cobre todas as coleções novas/alteradas;
- [ ] `storage.rules` foi revisado se anexos mudaram;
- [ ] `grupoId` e `empresaId` permanecem protegidos;
- [ ] perfil sem permissão foi testado;
- [ ] operações críticas não dependem apenas de botão oculto;
- [ ] não existe delete destrutivo novo sem justificativa explícita;
- [ ] migração de dados, se houver, é idempotente e possui rollback;
- [ ] QA de sintaxe e browser passou;
- [ ] documentação de continuidade foi atualizada.

---

## 11. Incidente e recuperação

Se houver suspeita de acesso indevido, exposição de segredo ou corrupção de dados:

1. interromper nova publicação;
2. preservar evidências e commits envolvidos;
3. revogar imediatamente a credencial exposta, quando existir;
4. revisar Rules e logs disponíveis;
5. identificar Grupo/Empresa/documentos afetados;
6. não sobrescrever em massa os dados antes de entender a extensão do problema;
7. corrigir a causa;
8. executar migração/restauração controlada se necessário;
9. documentar o incidente e a correção.

Segredo commitado deve ser considerado comprometido mesmo após apagar o arquivo do commit mais recente; a credencial deve ser rotacionada.

---

## 12. Continuidade e revisão

Ler também:

- `AGENTS.md`;
- `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`;
- `docs/SIG-MANUAL-MESTRE.md`;
- `docs/SIG-GUIA-DE-CONTINUIDADE.md`;
- `firestore.rules`;
- `storage.rules`.

Esta política deve ser atualizada quando houver mudança relevante em autenticação, permissões, armazenamento, hospedagem, modelo multiempresa, integrações ou tratamento de dados sensíveis.
