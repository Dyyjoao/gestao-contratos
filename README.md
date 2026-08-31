# SIG — Sistema Integrado de Gestão

WebApp/PWA empresarial construído com Firebase e frontend modular em JavaScript.

## Escopo ativo

- Minha Mesa
- Dashboard gerencial
- Contratos
- Controladoria & FP&A
- Governança & Compliance
- Administração
  - Empresas
  - Usuários
  - Perfis de acesso
  - Grupo empresarial

Módulos operacionais antigos podem continuar no repositório para reaproveitamento futuro em um sistema separado de Gestão de Operações, mas não fazem parte do escopo ativo do SIG sem decisão arquitetural explícita.

## Comece por aqui

A documentação oficial de continuidade está em:

- `AGENTS.md` — instruções automáticas para agentes/desenvolvedores que abrem o repositório;
- `docs/SIG-DOSSIE-DE-CONTINUIDADE.md` — handoff completo e portátil do projeto;
- `docs/SIG-MANUAL-MESTRE.md` — princípios e regras estruturais.

## Arquitetura

O frontend é modularizado em `js/`, com autenticação e contexto global. A Controladoria usa carregamento sob demanda por submenu para reduzir custo de abertura e consultas desnecessárias.

Firebase Authentication e Cloud Firestore são independentes do provedor que hospeda o frontend. Mover o site para outro host ou domínio não apaga a base, desde que a aplicação continue apontando para o mesmo projeto Firebase e as configurações de autenticação/domínio sejam atualizadas quando necessário.

`firestore.rules` é a camada real de segurança do banco e deve evoluir junto com qualquer mudança de persistência/permissões.

## Qualidade

GitHub Actions executa validação de sintaxe JavaScript, contratos arquiteturais e smoke tests em navegador headless, incluindo importação dos módulos dinâmicos da Controladoria.

Mudanças estruturais devem atualizar também o Dossiê de Continuidade.
