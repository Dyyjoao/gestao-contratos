# Premissas + atalho Detran ES

## Premissas
- Mantém `Estornar ADM` como correção normal e histórica.
- Adiciona `Excluir ADM` somente para Administrador.
- Exige reautenticação pela senha do Administrador atualmente logado e motivo obrigatório.
- Faz varredura fail-closed de referências de planejamento antes da exclusão física.
- Se houver referência, bloqueia a exclusão e orienta o uso de estorno.
- Exclusão permitida usa `excluirComAuditoria`, gravando `auditoriaAdministrativa` no mesmo batch do delete.
- `firestore.rules` permite delete de `premissasPlanejamento` somente a Administrador com acesso ao documento.

## Gestão de Frota
- Adiciona atalho `Detran ES · IPVA/Licenciamento` no cabeçalho da Gestão de Frota.
- Adiciona também `Consultar Detran ES` junto às ações de obrigações.
- O link abre a área oficial de veículos do Detran|ES em nova aba.
- O atalho não automatiza consulta nem transmite placa/RENAVAM; apenas direciona para o serviço oficial.