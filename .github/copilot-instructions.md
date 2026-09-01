# SIG - Copilot instructions

Antes de propor ou aplicar qualquer alteração, considere obrigatórios:

- `AGENTS.md`
- `docs/SIG-DOSSIE-DE-CONTINUIDADE.md`
- `docs/SIG-MANUAL-MESTRE.md`
- `docs/SIG-FIREBASE-DEPLOY-E-RULES.md`

Inspecione `app.js` para o escopo ativo, `js/controllership-router.js` para as versões vigentes da Controladoria e `firestore.rules` sempre que houver leitura/gravação/permissão.

Plano vigente: `ctrl-chart-accounts-v6.js`, máscara `#.##.##.####`, estrutura Raiz → Sintética N1 → Sintética N2 → Analítica. Sintéticas não recebem lançamento. Conta com histórico deve ser inativada; exclusão é apenas para cadastro de teste/erro sem referências e precisa respeitar a validação do Plano v6.

Não reative módulos operacionais antigos sem decisão explícita. Preserve natureza/multiplicadores, CCs técnicos, ciclos de Budget/Forecast, fechamento de competências, fail-closed de bases críticas e segurança do Firestore.

Mudança estrutural exige atualização do Dossiê de Continuidade e dos checks de QA correspondentes.
