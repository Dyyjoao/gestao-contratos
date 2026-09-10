import { db, state, admin, permite } from "./core.js";
import { listarDocumentosEmpresa, empresasSelecionadasIds, grupoAtualId, periodoAno, emitirAlteracao } from "./shared.js";
import { normalizarClassificacaoDre, contaLancavelResultado } from "./dre-classification.js";
import { contaAtivaNoExercicio } from "./account-validity.js";
import { contratoVigenteNoMes, valorContratoNoMes, valoresContratoNoAno, snapshotReajusteContrato } from "./contract-projection.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const idSeguro=v=>String(v||"sem").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,120);
const stamp=x=>n(x?.atualizadoEm?.seconds||x?.criadoEm?.seconds||0);
const vazio=()=>Object.fromEntries(MESES.map(m=>[m,0]));
const soma=(a,b)=>Object.fromEntries(MESES.map(m=>[m,n(a?.[m])+n(b?.[m])]));
const sub=(a,b)=>Object.fromEntries(MESES.map(m=>[m,n(a?.[m])-n(b?.[m])]));
const temValor=v=>MESES.some(m=>Math.abs(n(v?.[m]))>0.000001);
const ativoContrato=c=>c?.status==="ativo";
const podePlan=cenario=>admin()||permite("controladoria","editar")||permite("controladoria",cenario);
const podeCaixa=()=>admin()||permite("controladoria","editar")||permite("controladoria","caixaLancar");
function descricaoContrato(c){return`Contrato · ${c.numero||c.fornecedor||c.id} · ${c.fornecedor||c.objeto||"Contrato"}`}
function chaveConta(contaId,cc){return`${cc||""}|${contaId||""}`}
function parseChave(k){const p=String(k).indexOf("|");return{cc:p>=0?k.slice(0,p):"",contaId:p>=0?k.slice(p+1):k}}
function versaoPadrao(cenario,ano){return cenario==="budget"?`Budget ${ano} - V1`:`F${String(new Date().getMonth()+1).padStart(2,"0")}`}
function versaoSelecionada(cenario){const id=cenario==="budget"?"pagina-ctrl-budget-v7-versao":"pagina-ctrl-forecast-v5-versao";return String(document.getElementById(id)?.value||"").trim()}
function fechadoForecast(){const el=document.getElementById("pagina-ctrl-forecast-v5-fechado");return Math.max(0,Math.min(12,n(el?.value??new Date().getMonth())))}
function statusBudgetMeta(linhas,ano,versao){return linhas.find(d=>d.tipoRegistro==="budget_meta"&&Number(d.exercicio)===Number(ano)&&d.versao===versao)?.statusCiclo||"nao_aberto"}
function linhaCanonica(linhas,{ano,versao,contaId,cc}){return linhas.filter(d=>d.tipoRegistro!=="budget_meta"&&Number(d.exercicio)===Number(ano)&&d.versao===versao&&d.contaId===contaId&&(d.centroCustoId||"")===(cc||"")).sort((a,b)=>stamp(b)-stamp(a))[0]||null}
function versaoRecente(linhas,ano){const m=new Map();for(const d of linhas){if(d.tipoRegistro==="budget_meta"||Number(d.exercicio)!==Number(ano)||!d.versao)continue;m.set(d.versao,Math.max(m.get(d.versao)||0,stamp(d)))}return[...m.entries()].sort((a,b)=>b[1]-a[1]||String(b[0]).localeCompare(String(a[0]),"pt-BR"))[0]?.[0]||""}
function detalheId(cenario,ano,versao,contratoId){return`ctr_${cenario}_${ano}_${idSeguro(versao)}_${idSeguro(contratoId)}`}
function linhaDriverId(cenario,ano,versao,cc,contaId){return`ctrline_${cenario}_${ano}_${idSeguro(versao)}_${idSeguro(cc)}_${idSeguro(contaId)}`}
function contaPermitidaNoCentro(conta,centro,ano){return !!conta&&!!centro&&contaLancavelResultado(conta)&&contaAtivaNoExercicio(conta,ano)&&Array.isArray(centro.contasPermitidas)&&centro.contasPermitidas.includes(conta.id)}

async function reconciliarPlanejamentoEmpresa(empresaId,cenario,{versaoForcada="",atualizarTela=false}={}){
  if(!empresaId||!podePlan(cenario))return{alterados:0,bloqueados:0,ignorados:0};
  const ano=periodoAno(),colecaoLinhas=cenario==="budget"?"budgetLinhas":"forecastLinhas";
  const [contratos,detalhes,linhas,plano,centros]=await Promise.all([listarDocumentosEmpresa("contratos",empresaId),listarDocumentosEmpresa("planejamentoDetalhes",empresaId),listarDocumentosEmpresa(colecaoLinhas,empresaId),listarDocumentosEmpresa("planoContasGerencial",empresaId),listarDocumentosEmpresa("centrosCusto",empresaId)]);
  const pmap=new Map(plano.map(c=>[c.id,c])),cmap=new Map(centros.map(c=>[c.id,c]));
  const versao=versaoForcada||versaoSelecionada(cenario)||versaoRecente(linhas,ano)||versaoPadrao(cenario,ano);
  if(cenario==="budget"&&statusBudgetMeta(linhas,ano,versao)==="finalizado")return{alterados:0,bloqueados:1,ignorados:0};
  const existentes=detalhes.filter(d=>d.cenario===cenario&&Number(d.exercicio)===Number(ano)&&d.versao===versao&&d.origem==="contrato");
  const porContrato=new Map(existentes.map(d=>[d.origemContratoId,d])),antigosPorChave=new Map();
  for(const d of existentes.filter(x=>x.status!=="inativo")){const k=chaveConta(d.contaId,d.centroCustoId);antigosPorChave.set(k,soma(antigosPorChave.get(k)||vazio(),d.valores||vazio()))}
  const desejados=new Map();let ignorados=0;
  for(const c of contratos){
    if(c.planejamentoAtivo!==true||!ativoContrato(c)||!c.contaGerencialId||!c.centroCustoId)continue;
    const conta=pmap.get(c.contaGerencialId),centro=cmap.get(c.centroCustoId);if(!contaPermitidaNoCentro(conta,centro,ano)){ignorados++;continue}
    const valores=valoresContratoNoAno(c,ano,MESES);if(!temValor(valores))continue;
    const k=chaveConta(c.contaGerencialId,c.centroCustoId),linha=linhaCanonica(linhas,{ano,versao,contaId:c.contaGerencialId,cc:c.centroCustoId});if(linha?.lancamentoFechado===true)continue;
    desejados.set(c.id,{contrato:c,k,valores});
  }
  const novosPorChave=new Map();for(const x of desejados.values())novosPorChave.set(x.k,soma(novosPorChave.get(x.k)||vazio(),x.valores));
  let alterados=0;
  for(const [contratoId,x] of desejados){const ant=porContrato.get(contratoId),ref=doc(db,"planejamentoDetalhes",ant?.id||detalheId(cenario,ano,versao,contratoId));const payload={grupoId:grupoAtualId(),empresaId,cenario,exercicio:ano,versao,contaId:x.contrato.contaGerencialId,centroCustoId:x.contrato.centroCustoId,origem:"contrato",origemContratoId:contratoId,descricao:descricaoContrato(x.contrato),valores:x.valores,status:"ativo",automatico:true,comentario:x.contrato.comentarioPlanejamento||"",regraReajuste:snapshotReajusteContrato(x.contrato),atualizadoEm:serverTimestamp()};if(!ant){payload.criadoPor=state.usuario?.id||"";payload.criadoEm=serverTimestamp()}await setDoc(ref,payload,{merge:true});alterados++}
  for(const d of existentes){if(desejados.has(d.origemContratoId)||d.status==="inativo")continue;await setDoc(doc(db,"planejamentoDetalhes",d.id),{status:"inativo",atualizadoEm:serverTimestamp()},{merge:true});alterados++}
  const chaves=new Set([...antigosPorChave.keys(),...novosPorChave.keys()]);
  for(const k of chaves){const delta=sub(novosPorChave.get(k)||vazio(),antigosPorChave.get(k)||vazio());if(!temValor(delta))continue;const{cc,contaId}=parseChave(k),linha=linhaCanonica(linhas,{ano,versao,contaId,cc});if(linha?.lancamentoFechado===true)continue;const atual={...vazio(),...(linha?.valores||{})},proximo=soma(atual,delta),ref=doc(db,colecaoLinhas,linha?.id||linhaDriverId(cenario,ano,versao,cc,contaId));const payload={grupoId:grupoAtualId(),empresaId,contaId,centroCustoId:cc,exercicio:ano,versao,valores:proximo,status:linha?.status||"rascunho",lancamentoFechado:linha?.lancamentoFechado===true,atualizadoEm:serverTimestamp()};if(cenario==="forecast")payload.realizadoFechadoAte=linha?.realizadoFechadoAte??fechadoForecast();if(!linha){payload.criadoPor=state.usuario?.id||"";payload.criadoEm=serverTimestamp()}await setDoc(ref,payload,{merge:true});alterados++}
  if(alterados){emitirAlteracao(cenario);emitirAlteracao("controladoria")}
  if(ignorados)window.dispatchEvent(new CustomEvent("sig:contract-driver-warning",{detail:{empresaId,cenario,ignorados,motivo:"conta-centro-invalido"}}));
  if(atualizarTela){const id=cenario==="budget"?"pagina-ctrl-budget-v7-atualizar":"pagina-ctrl-forecast-v5-atualizar";setTimeout(()=>document.getElementById(id)?.click(),120)}
  return{alterados,bloqueados:0,ignorados};
}
function dataMensal(ano,mes1,dia){const ultimo=new Date(Date.UTC(ano,mes1,0)).getUTCDate();return`${ano}-${String(mes1).padStart(2,"0")}-${String(Math.min(Math.max(1,dia),ultimo)).padStart(2,"0")}`}
function addMeses(ano,mes0,q){const d=new Date(Date.UTC(ano,mes0+q,1));return{ano:d.getUTCFullYear(),mes0:d.getUTCMonth()}}
function contaNaturezaCaixa(conta){const cl=conta?normalizarClassificacaoDre(conta):null;return cl?.tipo==="receita"?"entrada":"saida"}
function contaClasseCaixa(conta){const linha=conta?normalizarClassificacaoDre(conta).linha:"";if(linha==="financeiro")return"financeiro";if(linha==="tributos_lucro")return"tributos";if(linha==="pessoal")return"pessoal";return"operacional"}
function caixaId(contratoId,comp){return`ctr_cash_${idSeguro(contratoId)}_${String(comp).replace("-","")}`}
async function reconciliarCaixaEmpresa(empresaId){
  if(!empresaId||!podeCaixa())return{alterados:0};
  const[contratos,lancamentos,plano]=await Promise.all([listarDocumentosEmpresa("contratos",empresaId),listarDocumentosEmpresa("fluxoCaixaLancamentos",empresaId),listarDocumentosEmpresa("planoContasGerencial",empresaId).catch(()=>[])]);
  const pmap=new Map(plano.map(c=>[c.id,c])),agora=new Date(),inicio={ano:agora.getFullYear(),mes0:agora.getMonth()},fim=addMeses(inicio.ano,inicio.mes0,18),inicioComp=`${inicio.ano}-${String(inicio.mes0+1).padStart(2,"0")}`,fimComp=`${fim.ano}-${String(fim.mes0+1).padStart(2,"0")}`;
  const existentes=lancamentos.filter(l=>l.origem==="contrato"&&l.origemContratoId&&String(l.competencia||"")>=inicioComp),porId=new Map(existentes.map(l=>[`${l.origemContratoId}|${l.competencia}`,l])),desejados=new Map();
  for(const c of contratos){if(c.fluxoCaixaAtivo!==true||!ativoContrato(c)||!c.contaGerencialId||!n(c.diaVencimento))continue;const conta=pmap.get(c.contaGerencialId)||null;if(!conta||!contaLancavelResultado(conta))continue;for(let q=0;q<=18;q++){const{ano,mes0}=addMeses(inicio.ano,inicio.mes0,q),comp=`${ano}-${String(mes0+1).padStart(2,"0")}`;if(comp>fimComp||!contratoVigenteNoMes(c,ano,mes0))continue;const valor=valorContratoNoMes(c,ano,mes0);if(!valor)continue;desejados.set(`${c.id}|${comp}`,{c,comp,data:dataMensal(ano,mes0+1,n(c.diaVencimento)),valor,conta})}}
  let alterados=0;
  for(const[k,x]of desejados){const ant=porId.get(k);if(ant&&!["provisao"].includes(ant.status))continue;const ref=doc(db,"fluxoCaixaLancamentos",ant?.id||caixaId(x.c.id,x.comp)),payload={grupoId:grupoAtualId(),empresaId,data:x.data,natureza:contaNaturezaCaixa(x.conta),status:"provisao",contaBancariaId:ant?.contaBancariaId||"",classe:contaClasseCaixa(x.conta),centroCustoId:x.c.centroCustoId||"",categoria:"Contrato",descricao:descricaoContrato(x.c),valor:Math.abs(x.valor),observacao:x.c.comentarioPlanejamento||"Provisão automática originada no módulo de Contratos.",origem:"contrato",origemContratoId:x.c.id,competencia:x.comp,automatico:true,regraReajuste:snapshotReajusteContrato(x.c),atualizadoEm:serverTimestamp()};if(!ant){payload.criadoPor=state.usuario?.id||"";payload.criadoEm=serverTimestamp()}await setDoc(ref,payload,{merge:true});alterados++}
  for(const l of existentes){const k=`${l.origemContratoId}|${l.competencia}`;if(desejados.has(k)||l.status!=="provisao")continue;const payload=admin()?{status:"cancelado",observacao:"Provisão contratual cancelada automaticamente porque o contrato deixou de gerar caixa.",atualizadoEm:serverTimestamp()}:{valor:0,observacao:"Provisão contratual desativada automaticamente; valor neutralizado.",atualizadoEm:serverTimestamp()};await setDoc(doc(db,"fluxoCaixaLancamentos",l.id),payload,{merge:true});alterados++}
  if(alterados)emitirAlteracao("fluxoCaixa");return{alterados};
}
let fila=Promise.resolve(),timer=null;
function empresasAlvo(){return empresasSelecionadasIds().filter(Boolean)}
function agendar(fn,ms=140){clearTimeout(timer);timer=setTimeout(()=>{fila=fila.then(fn).catch(e=>console.warn("Drivers de Contratos:",e))},ms)}
async function reconciliarTudo(){for(const emp of empresasAlvo()){await reconciliarCaixaEmpresa(emp);await reconciliarPlanejamentoEmpresa(emp,"budget");await reconciliarPlanejamentoEmpresa(emp,"forecast")}}
async function reconciliarTela(cenario){for(const emp of empresasAlvo())await reconciliarPlanejamentoEmpresa(emp,cenario,{versaoForcada:versaoSelecionada(cenario),atualizarTela:true})}
async function reconciliarCaixaAtual(){for(const emp of empresasAlvo())await reconciliarCaixaEmpresa(emp)}
function instalarValidacao(){document.addEventListener("submit",e=>{if(e.target?.id!=="formContrato")return;const plan=document.getElementById("contratoPlanejamentoAtivo")?.checked===true,caixa=document.getElementById("contratoCaixaAtivo")?.checked===true,cc=document.getElementById("contratoCentroCusto")?.value||"",dia=n(document.getElementById("contratoDiaVencimento")?.value),mensagem=document.getElementById("mensagemContrato");if(plan&&!cc){e.preventDefault();e.stopImmediatePropagation();if(mensagem)mensagem.textContent="Para usar o contrato no Budget/Forecast, selecione um centro de custo.";return}if(caixa&&(dia<1||dia>31)){e.preventDefault();e.stopImmediatePropagation();if(mensagem)mensagem.textContent="Para provisionar no caixa, informe o dia de pagamento entre 1 e 31."}},true)}
function decorarMemorias(){document.querySelectorAll('tr[data-plan-detail]').forEach(tr=>{if(tr.dataset.contractDriverReadonly==="1")return;const desc=String(tr.querySelector("[data-plan-desc]")?.value||"");if(!desc.startsWith("Contrato ·"))return;tr.dataset.contractDriverReadonly="1";tr.querySelectorAll("input,button").forEach(el=>el.disabled=true);const cells=[...tr.cells];if(cells.length>=2&&cells[cells.length-2].textContent!=="Contrato automático")cells[cells.length-2].textContent="Contrato automático";if(cells.length&&cells[cells.length-1].textContent!=="🔒")cells[cells.length-1].textContent="🔒"})}
function instalarObservador(){const o=new MutationObserver(decorarMemorias);o.observe(document.body,{childList:true,subtree:true});decorarMemorias()}
window.addEventListener("sig:contract-driver-changed",()=>agendar(reconciliarTudo,80));window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="contratos")agendar(reconciliarTudo,120)});window.addEventListener("sig:periodo-changed",()=>agendar(async()=>{const p=document.querySelector(".pagina:not(.hidden)")?.id||"";if(p.includes("budget"))await reconciliarTela("budget");else if(p.includes("forecast"))await reconciliarTela("forecast")},180));window.addEventListener("sig:page",e=>{const p=String(e.detail?.pagina||"");if(p.includes("budget"))agendar(()=>reconciliarTela("budget"),260);else if(p.includes("forecast"))agendar(()=>reconciliarTela("forecast"),260)});document.addEventListener("change",e=>{if(e.target?.id==="pagina-ctrl-budget-v7-versao")agendar(()=>reconciliarTela("budget"),100);if(["pagina-ctrl-forecast-v5-versao","pagina-ctrl-forecast-v5-fechado"].includes(e.target?.id))agendar(()=>reconciliarTela("forecast"),100)});document.addEventListener("click",e=>{if(e.target?.closest?.("#tabFluxoCaixa,#lazyFluxoCaixa,[data-fpa-tab='caixa']"))agendar(reconciliarCaixaAtual,220)});window.addEventListener("sig:ready",()=>agendar(reconciliarTudo,500));
instalarValidacao();instalarObservador();