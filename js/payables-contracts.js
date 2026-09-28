import { db, state, admin, permite } from "./core.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { listarDocumentos, listarDocumentosEmpresa, atualizarDocumento, grupoAtualId, empresasSelecionadasIds, emitirAlteracao } from "./shared.js";
import { contratoVigenteNoMes, valorContratoNoMes, snapshotReajusteContrato } from "./contract-projection.js";

const COLECAO="contasPagar",HORIZONTE_MESES=18;
let contratosCache=[],contratoEditandoId="",salvamentoPendente=null,fila=Promise.resolve(),timer=null;
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const podeConfigurar=()=>admin()||permite("contasPagar","cadastrar")||permite("contasPagar","editar");
const idSeguro=v=>String(v||"sem").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,100);
const comp=(a,m0)=>`${a}-${String(m0+1).padStart(2,"0")}`;
const addMeses=(a,m0,q)=>{const d=new Date(Date.UTC(a,m0+q,1));return{ano:d.getUTCFullYear(),mes0:d.getUTCMonth()}};
function dataVencimento(a,m0,dia){const ultimo=new Date(Date.UTC(a,m0+1,0)).getUTCDate();return`${a}-${String(m0+1).padStart(2,"0")}-${String(Math.min(Math.max(1,dia),ultimo)).padStart(2,"0")}`}
function docId(cId,competencia){return`ctr_ap_${idSeguro(cId)}_${String(competencia).replace("-","")}`}
function ativo(c){return c?.status==="ativo"&&c?.contasPagarAtivo===true&&n(c.valorMensal)>0&&n(c.diaVencimento)>=1&&n(c.diaVencimento)<=31}

function montarIntegracao(){
  if(document.getElementById("contratoContasPagarAtivo"))return true;
  const grid=document.querySelector("#formContrato .form-grid");if(!grid)return false;
  const card=document.createElement("div");card.className="campo-span-3 ap-contract-card";card.innerHTML=`
    <div class="ap-contract-info"><strong>Contas a Pagar</strong><small>Gere automaticamente os vencimentos mensais deste contrato no cockpit operacional.</small></div>
    <label class="driver-switch"><input id="contratoContasPagarAtivo" type="checkbox"><span>Enviar ao Contas a Pagar</span></label>
    <div class="campo"><label for="contratoDiaVencimentoAp">Dia de pagamento</label><input id="contratoDiaVencimentoAp" type="number" min="1" max="31" placeholder="Ex.: 10"></div>`;
  const ancora=document.querySelector(".drive-anexo-card")?.closest(".campo-span-3");if(ancora)ancora.after(card);else grid.appendChild(card);
  if(!document.getElementById("sig-ap-contract-css")){const st=document.createElement("style");st.id="sig-ap-contract-css";st.textContent=".ap-contract-card{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(160px,220px);gap:14px;align-items:center;margin-top:10px;padding:12px;border:1px solid #dbe4e8;border-radius:11px;background:#f8fbfb}.ap-contract-card strong,.ap-contract-card small{display:block}.ap-contract-card small{margin-top:3px;color:#667085}@media(max-width:900px){.ap-contract-card{grid-template-columns:1fr}}";document.head.appendChild(st)}
  document.getElementById("contratoContasPagarAtivo")?.addEventListener("change",atualizarVisual);atualizarVisual();return true;
}
function atualizarVisual(){const ativo=document.getElementById("contratoContasPagarAtivo")?.checked===true,dia=document.getElementById("contratoDiaVencimentoAp");if(dia)dia.disabled=!ativo||!podeConfigurar()}
function preencherToggle(id=""){const c=contratosCache.find(x=>x.id===id),chk=document.getElementById("contratoContasPagarAtivo"),dia=document.getElementById("contratoDiaVencimentoAp");if(!chk)return;chk.checked=c?.contasPagarAtivo===true;chk.disabled=!podeConfigurar();if(dia)dia.value=n(c?.diaVencimento)||"";atualizarVisual()}
async function atualizarCache(){try{contratosCache=await listarDocumentos("contratos")}catch{contratosCache=[]}}

async function sincronizarEmpresa(empresaId){
  if(!empresaId||!podeConfigurar())return{alterados:0};
  const [contratos,contas]=await Promise.all([listarDocumentosEmpresa("contratos",empresaId),listarDocumentosEmpresa(COLECAO,empresaId)]);
  const agora=new Date(),inicio={ano:agora.getFullYear(),mes0:agora.getMonth()},inicioComp=comp(agora.getFullYear(),agora.getMonth()),existentes=contas.filter(x=>x.origem==="contrato"&&x.origemContratoId),map=new Map(existentes.map(x=>[`${x.origemContratoId}|${x.competencia}`,x])),desejados=new Map();
  for(const c of contratos){if(!ativo(c))continue;for(let q=0;q<=HORIZONTE_MESES;q++){const {ano,mes0}=addMeses(inicio.ano,inicio.mes0,q);if(!contratoVigenteNoMes(c,ano,mes0))continue;const valor=valorContratoNoMes(c,ano,mes0);if(!valor)continue;const competencia=comp(ano,mes0);desejados.set(`${c.id}|${competencia}`,{c,competencia,valor,vencimento:dataVencimento(ano,mes0,n(c.diaVencimento))})}}
  let alterados=0;
  for(const [k,x] of desejados){const ant=map.get(k);if(ant&&["pago","estornado"].includes(ant.status))continue;const reabrir=ant?.status==="cancelado"&&ant?.canceladoAutomatico===true;const payload={grupoId:grupoAtualId(),empresaId,fornecedor:x.c.fornecedor||"Fornecedor",descricao:x.c.objeto||`Contrato ${x.c.numero||""}`,documento:x.c.numero||"",categoria:"Contrato",valor:Math.abs(x.valor),valorBaseContrato:Math.abs(n(x.c.valorMensal)),regraReajuste:snapshotReajusteContrato(x.c),vencimento:x.vencimento,responsavel:x.c.responsavel||"",observacao:"Obrigação gerada automaticamente pelo módulo de Contratos.",origem:"contrato",origemContratoId:x.c.id,contratoReferencia:x.c.numero||x.c.fornecedor||"Contrato",competencia:x.competencia,status:reabrir?"aberto":ant?.status||"aberto",canceladoAutomatico:false,atualizadoEm:serverTimestamp()};if(!ant){payload.criadoPor=state.usuario?.id||"";payload.criadoEm=serverTimestamp()}await setDoc(doc(db,COLECAO,ant?.id||docId(x.c.id,x.competencia)),payload,{merge:true});alterados++}
  for(const ant of existentes){const k=`${ant.origemContratoId}|${ant.competencia}`;if(String(ant.competencia||"")<inicioComp)continue;if(desejados.has(k)||["pago","estornado","cancelado"].includes(ant.status))continue;await setDoc(doc(db,COLECAO,ant.id),{status:"cancelado",canceladoAutomatico:true,motivoCancelamento:"Contrato deixou de gerar esta obrigação.",atualizadoEm:serverTimestamp()},{merge:true});alterados++}
  if(alterados)emitirAlteracao("contasPagar");return{alterados};
}
async function sincronizarSelecionadas(){for(const id of [...new Set(empresasSelecionadasIds().filter(Boolean))])await sincronizarEmpresa(id)}
function agendar(fn=sincronizarSelecionadas,ms=180){clearTimeout(timer);timer=setTimeout(()=>{fila=fila.then(fn).catch(e=>console.warn("Contas a Pagar · contratos:",e))},ms)}
function instalarEventos(){
  document.addEventListener("click",e=>{const edit=e.target?.closest?.("[data-ctr-edit]");if(edit){contratoEditandoId=edit.dataset.ctrEdit||"";setTimeout(()=>{montarIntegracao();preencherToggle(contratoEditandoId)},40);return}if(e.target?.closest?.("#btnNovoContrato")){contratoEditandoId="";setTimeout(()=>{montarIntegracao();preencherToggle("")},40)}},true);
  document.addEventListener("submit",e=>{if(e.target?.id!=="formContrato")return;montarIntegracao();const chk=document.getElementById("contratoContasPagarAtivo"),ativoChk=chk?.checked===true,dia=Math.trunc(n(document.getElementById("contratoDiaVencimentoAp")?.value)),valor=n(document.getElementById("contratoValor")?.value),m=document.getElementById("mensagemContrato");if(ativoChk&&(dia<1||dia>31||valor<=0)){e.preventDefault();e.stopImmediatePropagation();if(m)m.textContent="Para enviar ao Contas a Pagar, informe valor mensal e dia de pagamento entre 1 e 31.";return}salvamentoPendente={ativo:ativoChk,dia:ativoChk?dia:0}},true);
  window.addEventListener("sig:contract-driver-changed",e=>agendar(async()=>{const id=e.detail?.contratoId;if(!id)return;try{if(salvamentoPendente){await atualizarDocumento("contratos",id,{contasPagarAtivo:salvamentoPendente.ativo,diaVencimento:salvamentoPendente.dia});salvamentoPendente=null}await atualizarCache();const c=contratosCache.find(x=>x.id===id);if(c?.empresaId)await sincronizarEmpresa(c.empresaId)}catch(err){console.error("Falha ao sincronizar contrato com Contas a Pagar",err)}},60));
  window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="contratos")agendar(async()=>{await atualizarCache();await sincronizarSelecionadas()},350)});
  window.addEventListener("sig:empresa-changed",()=>agendar(async()=>{await atualizarCache();preencherToggle(contratoEditandoId);await sincronizarSelecionadas()},300));
  window.addEventListener("sig:ready",()=>agendar(async()=>{montarIntegracao();await atualizarCache();preencherToggle(contratoEditandoId);await sincronizarSelecionadas()},700));
}
montarIntegracao();instalarEventos();atualizarCache();
