# SIG — Sistema Integrado de Gestão

WebApp/PWA empresarial construído com Firebase + GitHub Pages, sem servidor próprio.

## Módulos

- Dashboard integrado
- Contratos
- Prestadores & Oficinas
- Frota
- Almoxarifado
- Solicitações & Cotações
- Controladoria & Planejamento
- Administração
  - Empresas
  - Usuários
  - Perfis de acesso
  - Grupo empresarial

## Arquitetura

O front-end é modularizado em `js/`, com autenticação e contexto em `core.js`. Os módulos operacionais usam Firestore e respeitam empresa, grupo empresarial e perfil de acesso. O arquivo `firestore.rules` mantém a proposta de segurança do banco e deve ser publicado no Firebase antes da liberação de usuários não administradores.

## Qualidade

Pull requests executam validação automática de sintaxe JavaScript e smoke test em navegador headless.
