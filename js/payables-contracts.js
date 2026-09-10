import { db, state, admin, permite } from "./core.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { listarDocumentos, listarDocumentosEmpresa, atualizarDocumento, grupoAtualId, emitirAlteracao } from "./shared.js";

const COLECAO="contasPagar";
const HORIZONTE_MESES=18;
let contratosCache=[];
let contratoEditandoId="";
let salvamentoPendente=null;
let fila=Promise.resolve();
let timer=null;

const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const podeConfigurar=()=>admin()||permite("contasPagar","cadastrar")||permite("contasPagar","editar");
const idSeguro=v=>String(v||"sem").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,100);
const comp=(a,m0)=>`${a}-${String(m0+1).padStart(2,"0")}`;
const indiceMes=iso=>{const s=String(iso||"");return /^\d{4}-\d{2}/.test(s)?Number(s.slice(0,4))*12+Number(s.slice(5,7))-1:null};
const vigente=(c,a,m0)=>{const alvo=a*12+m0,ini=indiceMes(c.inicio),fim=indiceMes(c.fim);return(ini===null||alvo>=ini)&&(fim===null||alvo<=fim)};
const addMeses=(a,m0,q)=>{const d=new Date(Date.UTC(a,m0+q,1));return{ano:d.getUTCFullYear(),mes0:d.getUTCMonth()}};
function dataVencimento(a,m0,dia){const ultimo=new Date(Date.UTC(a,m0+1,0)).getUTCDate();return`${a}-${String(m0+1).padStart(2,"0")}-${String(Math.min(Math.max(1,dia),ultimo)).padStart(2,"0")}`}
function docId(cId,competencia){return`ctr_ap_${idSeguro(cId)}_${String(competencia).replace("-","")}`}
function ativo(c){return c?.status==="ativo"&&c?.contasPagarAtivo===true&&n(c.valorMensal)>0&&n(c.diaVencimento)>=1&&n(c.diaVencimento)<=31}

function montarIntegracao(){
  if(document.getElementById("contratoContasPagarAtivo"))return true;
  const driver=document.querySelector(".contrato-driver-card");if(!driver)return false;
  const card=document.createElement("div");card.className="campo-span-3 ap-contract-card";card.innerHTML=`<div><strong>Contas a Pagar</strong><small>Envie os vencimentos mensais deste contrato ao cockpit operacional. Esta integração não alimenta DRE, Budget ou Forecast.</small></div><label class="driver-switch"><input id="contratoContasPagarAtivo" type="checkbox"><span>Enviar ao Contas a Pagar</span></label>`;driver.after(card);
  const st=document.createElement("style");st.id="sig-ap-contract-css";st.textContent=`.ap-contract-card{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-top:10px;padding:12px;border:1px solid #dbe4e8;border-radius:11px;background:#f8fbfb}.ap-contract-card strong,.ap-contract-card small{display:block}.ap-contract-card small{margin-top:3px;color:#667085;max-width:680px}.contrato-driver-campos.ap-contract-active{opacity:1!important;pointer-events:auto!important}@media(max-width:720px){.ap-contract-card{align-items:flex-start;flex-direction:column}}`;document.head.appendChild(st);
  document.getElementById("contratoContasPagarAtivo")?.addEventListener("change",atualizarVisual);
  atualizarVisual();return true;
}
function atualizarVisual(){const chk=document.getElementById("contratoContasPagarAtivo"),campos=document.getElementById("contratoDriverCampos");campos?.classList.toggle("ap-contract-active",chk?.checked===true)}
function preencherToggle(id=""){const chk=document.getElementById("contratoContasPagarAtivo");if(!chk)return;const c=contratosCache.find(x=>x.id===id);chk.checked=c?.contasPagarAtivo===true;chk.disabled=!podeConfigurar();atualizarVisual()}
async function atualizarCache(){try{contratosCache=await listarDocumentos("contratos")}catch{contratosCache=[]}}

async function sincronizarEmpresa(empresaId){
  if(!empresaId||!podeConfigurar())return{alterados:0};
  const [contratos,contas]=await Promise.all([listarDocumentosEmpresa("contratos",empresaId),listarDocumentosEmpresa(COLECAO,empresaId)]);
  const agora=new Date(),inicio={ano:agora.getFullYear(),mes0:agora.getMonth()},existentes=contas.filter(x=>x.origem==="contrato"&&x.origemContratoId),map=new Map(existentes.map(x=>[`${x.origemContratoId}|${x.competencia}`,x])),desejados=new Map();
  for(const c of contratos){if(!ativo(c))continue;for(let q=0;q<=HORIZONTE_MESES;q++){const {ano,mes0}=addMeses(inicio.ano,inicio.mes0,q);if(!vigente(c,ano,mes0))continue;const competencia=comp(ano,mes0);desejados.set(`${c.id}|${competencia}`,{c,competencia,vencimento:dataVencimento(ano,mes0,n(c.diaVencimento))})}}
  let alterados=0;
  for(const [k,x] of desejados){
    const ant=map.get(k);if(ant&&["pago","estornado"].includes(ant.status))continue;
    const reabrir=ant?.status==="cancelado"&&ant?.canceladoAutomatico===true;
    const payload={grupoId:grupoAtualId(),empresaId,fornecedor:x.c.fornecedor||"Fornecedor",descricao:x.c.objeto||`Contrato ${x.c.numero||""}`,documento:x.c.numero||"",categoria:"Contrato",valor:Math.abs(n(x.c.valorMensal)),vencimento:x.vencimento,responsavel:x.c.responsavel||"",observacao:"Obrigação gerada automaticamente pelo módulo de Contratos.",origem:"contrato",origemContratoId:x.c.id,contratoReferencia:x.c.numero||x.c.fornecedor||"Contrato",competencia:x.competencia,status:reabrir?"aberto":ant?.status||"aberto",canceladoAutomatico:false,atualizadoEm:serverTimestamp()};
    if(!ant){payload.criadoPor=state.usuario?.id||"";payload.criadoEm=serverTimestamp()}
    await setDoc(doc(db,COLECAO,ant?.id||docId(x.c.id,x.competencia)),payload,{merge:true});alterados++;
  }
  for(const ant of existentes){const k=`${ant.origemContratoId}|${ant.competencia}`;if(desejados.has(k)||["pago","estornado","cancelado"].includes(ant.status))continue;await setDoc(doc(db,COLECAO,ant.id),{status:"cancelado",canceladoAutomatico:true,motivoCancelamento:"Contrato deixou de gerar esta obrigação.",atualizadoEm:serverTimestamp()},{merge:true});alterados++}
  if(alterados)emitirAlteracao("contasPagar");return{alterados};
}
async function sincronizarSelecionadas(){const ids=[...new Set((state.empresasSelecionadasIds||[]).filter(Boolean))];for(const id of ids)await sincronizarEmpresa(id)}
function agendar(fn=sincronizarSelecionadas,ms=180){clearTimeout(timer);timer=setTimeout(()=>{fila=fila.then(fn).catch(e=>console.warn("Contas a Pagar · contratos:",e))},ms)}

function instalarEventos(){
  document.addEventListener("click",e=>{const edit=e.target?.closest?.("[data-ctr-edit]");if(edit){contratoEditandoId=edit.dataset.ctrEdit||"";setTimeout(()=>{montarIntegracao();preencherToggle(contratoEditandoId)},40);return}if(e.target?.closest?.("#btnNovoContrato")){contratoEditandoId="";setTimeout(()=>{montarIntegracao();preencherToggle("")},40)}},true);
  document.addEventListener("submit",e=>{if(e.target?.id!=="formContrato")return;montarIntegracao();const chk=document.getElementById("contratoContasPagarAtivo"),ativoChk=chk?.checked===true;if(ativoChk){const dia=n(document.getElementById("contratoDiaVencimento")?.value),valor=n(document.getElementById("contratoValor")?.value),m=document.getElementById("mensagemContrato");if(dia<1||dia>31||valor<=0){e.preventDefault();e.stopImmediatePropagation();if(m)m.textContent="Para enviar ao Contas a Pagar, informe valor mensal e dia de pagamento entre 1 e 31.";return}}salvamentoPendente={ativo:ativoChk}},true);
  window.addEventListener("sig:contract-driver-changed",e=>agendar(async()=>{const id=e.detail?.contratoId;if(!id||!salvamentoPendente)return;try{await atualizarDocumento("contratos",id,{contasPagarAtivo:salvamentoPendente.ativo});salvamentoPendente=null;await atualizarCache();const c=contratosCache.find(x=>x.id===id);if(c?.empresaId)await sincronizarEmpresa(c.empresaId)}catch(err){console.error("Falha ao vincular contrato ao Contas a Pagar",err)}},60));
  window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="contratos")agendar(async()=>{await atualizarCache();await sincronizarSelecionadas()},350)});
  window.addEventListener("sig:empresa-changed",()=>agendar(async()=>{await atualizarCache();await sincronizarSelecionadas()},300));
  window.addEventListener("sig:ready",()=>agendar(async()=>{montarIntegracao();await atualizarCache();await sincronizarSelecionadas()},700));
}

montarIntegracao();instalarEventos();atualizarCache();