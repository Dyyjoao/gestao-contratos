# QA — Controladoria & FP&A

Checklist mínimo antes de merge/publicação de mudança estrutural.

**Baseline:** 01/09/2026.

## 1. Automático

- [ ] `node --check` nos módulos JavaScript atuais;
- [ ] imports dinâmicos da Controladoria resolvem;
- [ ] Chrome headless/smoke test passa;
- [ ] Budget e Forecast são realmente abertos no browser test, não apenas importados;
- [ ] contratos arquiteturais do workflow passam;
- [ ] workflow valida as versões realmente roteadas em `js/controllership-router.js`;
- [ ] contrato Firebase valida `.firebaserc`, `firebase.json` e Rules críticas;
- [ ] Rules são revisadas quando persistência muda.

## 2. Plano de Contas

- [ ] máscara `#.##.####` respeitada;
- [ ] raiz → Sintética → Analítica;
- [ ] Sintética não lançável;
- [ ] código automático não colide;
- [ ] conta legada continua preservada até migração;
- [ ] vigência de conta funciona em exercício anterior/atual/posterior;
- [ ] inativação verifica uso futuro;
- [ ] inativação verifica vínculos de Imobilizado/CAPEX;
- [ ] se `imobilizados` estiver indisponível, inativação é bloqueada por segurança;
- [ ] cópia entre empresas não copia saldos/planejamento;
- [ ] lotes grandes não excedem limite de escrita do Firestore.

## 3. Natureza e Balanço

- [ ] Ativo normal;
- [ ] contra-Ativo;
- [ ] Passivo normal;
- [ ] contra-Passivo;
- [ ] Receita;
- [ ] Despesa;
- [ ] Estatística neutra;
- [ ] override explícito de natureza prevalece;
- [ ] saldo bruto persistido não é alterado pelo multiplicador;
- [ ] Balanço exibe diferença Ativo − Passivo/PL;
- [ ] Balanço mensal é posição, não soma;
- [ ] consolidação multiempresa ocorre por código;
- [ ] divergência de natureza do mesmo código é sinalizada;
- [ ] conta automática de Imobilizado substitui origem manual na apresentação;
- [ ] falha de leitura de `imobilizados` bloqueia integração automática em vez de assumir zero.

## 4. Input Mensal

- [ ] exige uma empresa e mês;
- [ ] Sintética bloqueada;
- [ ] Estatística Manual editável;
- [ ] Estatística Automática/Calculada bloqueada;
- [ ] Balanço recebe saldo bruto;
- [ ] conta patrimonial automática do Imobilizado bloqueia digitação;
- [ ] saldo manual antigo ignorado pela automação é sinalizado;
- [ ] falha de `imobilizados` não libera silenciosamente conta automática para digitação;
- [ ] competência fechada não altera;
- [ ] documento canônico prevalece;
- [ ] duplicidade é arquivada/controlada e não somada;
- [ ] limpeza de legado não arquiva CC técnico válido.

## 5. Budget / Forecast / Premissas

- [ ] Budget A-1 usa exercício anterior ao selecionado;
- [ ] ciclo Não aberto → Em elaboração → Finalizado;
- [ ] nova versão preserva anterior;
- [ ] Sintéticas somam descendentes;
- [ ] sublinhas compõem Analítica;
- [ ] Forecast usa Realizado fechado + futuro;
- [ ] premissa específica do CC vence corporativa;
- [ ] premissa Jan–Jun não afeta Jul–Dez;
- [ ] premissa Jul–Dez não retroage;
- [ ] vigência da própria conta é respeitada;
- [ ] depreciação automática entra em Budget/Forecast sem duplicidade manual;
- [ ] falha de `imobilizados` bloqueia depreciação projetada em vez de tratá-la como zero.

## 6. Imobilizado & CAPEX

- [ ] coleção `imobilizados` pode ser lida com perfil autorizado;
- [ ] perfil sem visualização da Controladoria não lê documentos;
- [ ] permissão `imobilizado`/edição permite criar e alterar conforme Rules;
- [ ] Grupo/Empresa não podem ser trocados em update;
- [ ] delete direto permanece bloqueado;
- [ ] mensagem de `permission-denied` orienta a verificar Rules publicadas;
- [ ] depreciação não começa antes da disponibilidade para uso;
- [ ] depreciação termina na vida útil;
- [ ] acumulada não supera a base depreciável;
- [ ] VCL não fica abaixo do residual;
- [ ] fim da depreciação não baixa automaticamente o bem.

## 7. DRE / Dashboard / Prestação

- [ ] Ativo e Passivo não entram no Resultado/OPEX;
- [ ] Estatística não entra no Resultado;
- [ ] natureza/multiplicador central é respeitado;
- [ ] DRE consolidada agrupa por código, não ID;
- [ ] cada empresa usa versão própria de Budget/Forecast;
- [ ] depreciação automática aparece sem duplicidade;
- [ ] falha de `imobilizados` bloqueia cenário projetado dependente;
- [ ] Dashboard e Prestação usam base financeira canônica;
- [ ] Prestação exige uma empresa;
- [ ] PDF da Prestação usa os mesmos valores da análise da tela.

## 8. Fluxo de Caixa

- [ ] exige uma empresa;
- [ ] mudar para multiempresa enquanto aberto limpa dados;
- [ ] formulários são fechados no contexto inválido;
- [ ] criar/editar/exportar ficam bloqueados;
- [ ] voltar para empresa única recarrega a base correta;
- [ ] provisões fixas não são duplicadas indevidamente.

## 9. Firebase / segurança / continuidade

- [ ] nenhuma credencial sensível entrou no diff;
- [ ] `grupoId` / `empresaId` permanecem protegidos;
- [ ] `firestore.rules` cobre coleções novas/alteradas;
- [ ] `storage.rules` foi revisado se anexos/caminhos mudaram;
- [ ] `.firebaserc` aponta para `gestao-de-contratos-b266b`;
- [ ] `firebase.json` referencia `firestore.rules` e `storage.rules`;
- [ ] nova coleção não é lançada sem Rule correspondente;
- [ ] dependência contábil crítica não converte erro em `[]`/zero silencioso;
- [ ] documentação descreve as rotas e o contrato de deploy atuais;
- [ ] não existem atalhos conhecidos para Plano/Premissas antigos;
- [ ] rollback do frontend não exige apagar a base;
- [ ] se Rules mudaram, o deploy Firebase separado foi concluído e testado com usuário autenticado.
