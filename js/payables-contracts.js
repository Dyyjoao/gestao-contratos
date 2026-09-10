import { db, state, admin, permite } from "./core.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { esc, listarDocumentos, listarDocumentosEmpresa, atualizarDocumento, grupoAtualId, empresasSelecionadasIds, emitirAlteracao } from "./shared.js";
import { contratoVigenteNoMes, valorContratoNoMes, snapshotReajusteContrato } from "./contract-projection.js";

const COLECAO="contasPagar";
const HORIZONTE_MESES=18;
let contratosCache=[];
let contasBancariasCache=[];
let contratoEditandoId="";
let salvamentoPendente=null;
let fila=Promise.resolve();
let timer=null;

const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const podeConfigurar=()=>admin()||permite("contasPagar","cadastrar")||permite("contasPagar","editar");
const podeVincularBanco=()=>admin();
const contaNome=x=>x?`${x.nome||"Conta"}${x.banco?` · ${x.banco}`:""}`:"";
const idSeguro=v=>String(v||"sem").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,100);
const comp=(a,m0)=>`${a}-${String(m0+1).padStart(2,"0")}`;
const addMeses=(a,m0,q)=>{const d=new Date(Date.UTC(a,m0+q,1));return{ano:d.getUTCFullYear(),mes0:d.getUTCMonth()}};
function dataVencimento(a,m0,dia){const ultimo=new Date(Date.UTC(a,m0+1,0)).getUTCDate();return`${a}-${String(m0+1).padStart(2,"0")}-${String(Math.min(Math.max(1,dia),ultimo)).padStart(2,"0")}`}
function docId(cId,competencia){return`ctr_ap_${idSeguro(cId)}_${String(competencia).replace("-","")}`}
function ativo(c){return c?.status==="ativo"&&c?.contasPagarAtivo===true&&n(c.valorMensal)>0&&n(c.diaVencimento)>=1&&n(c.diaVencimento)<=31}

function montarIntegracao(){
  if(document.getElementById("contratoContasPagarAtivo"))return true;
  const driver=document.querySelector(".contrato-driver-card");if(!driver)return false;
  const card=document.createElement("div");card.className="campo-span-3 ap-contract-card";card.innerHTML=`
    <div class="ap-contract-info"><strong>Contas a Pagar</strong><small>Envie os vencimentos mensais deste contrato ao cockpit operacional. Defina também a conta bancária prevista. Reajustes, alterações de índice e renovações atualizam automaticamente somente os vencimentos ainda abertos.</small></div>
    <label class="driver-switch"><input id="contratoContasPagarAtivo" type="checkbox"><span>Enviar ao Contas a Pagar</span></label>
    <div class="campo ap-contract-bank"><label for="contratoContaBancariaAp">Conta bancária prevista</label><select id="contratoContaBancariaAp"><option value="">Selecione a conta</option></select></div>`;driver.after(card);
  const st=document.createElement("style");st.id="sig-ap-contract-css";st.textContent=`.ap-contract-card{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(220px,300px);gap:14px;align-items:center;margin-top:10px;padding:12px;border:1px solid #dbe4e8;border-radius:11px;background:#f8fbfb}.ap-contract-card strong,.ap-contract-card small{display:block}.ap-contract-card small{margin-top:3px;color:#667085;max-width:680px}.ap-contract-bank{margin:0}.ap-contract-bank label{font-size:11px}.ap-contract-bank select{width:100%}.contrato-driver-campos.ap-contract-active{opacity:1!important;pointer-events:auto!important}@media(max-width:900px){.ap-contract-card{grid-template-columns:1fr}.ap-contract-bank{max-width:none}}`;document.head.appendChild(st);
  document.getElementById("contratoContasPagarAtivo")?.addEventListener("change",()=>{atualizarVisual();preencherContaContrato(contratoEditandoId)});
  document.getElementById("contratoEmpresa")?.addEventListener("change",()=>preencherContaContrato(contratoEditandoId));
  atualizarVisual();return true;
}
function empresaDoContrato(c){return c?.empresaId||document.getElementById("contratoEmpresa")?.value||""}
function preencherContaContrato(id=""){
  const sel=document.getElementById("contratoContaBancariaAp"),chk=document.getElementById("contratoContasPagarAtivo");if(!sel)return;const c=contratosCache.find(x=>x.id===id),empresaId=empresaDoContrato(c),valor=c?.contaBancariaIdContasPagar||sel.value||"";
  if(podeVincularBanco()){
    const elegiveis=contasBancariasCache.filter(x=>x.status!=="inativo"&&(!empresaId||x.empresaId===empresaId));sel.innerHTML='<option value="">Selecione a conta</option>'+elegiveis.map(x=>`<option value="${esc(x.id)}">${esc(contaNome(x))}</option>`).join("");if(valor&&elegiveis.some(x=>x.id===valor))sel.value=valor;else sel.value="";sel.disabled=chk?.checked!==true;
  }else{
    const nome=c?.contaBancariaNomeContasPagar||"Definida pelo Administrador";sel.innerHTML=`<option value="${esc(c?.contaBancariaIdContasPagar||"")}">${esc(nome)}</option>`;sel.value=c?.contaBancariaIdContasPagar||"";sel.disabled=true;
  }
}
function atualizarVisual(){const chk=document.getElementById("contratoContasPagarAtivo"),campos=document.getElementById("contratoDriverCampos"),sel=document.getElementById("contratoContaBancariaAp");campos?.classList.toggle("ap-contract-active",chk?.checked===true);if(sel)sel.disabled=!podeVincularBanco()||chk?.checked!==true}
function preencherToggle(id=""){const chk=document.getElementById("contratoContasPagarAtivo");if(!chk)return;const c=contratosCache.find(x=>x.id===id);chk.checked=c?.contasPagarAtivo===true;chk.disabled=!podeConfigurar();preencherContaContrato(id);atualizarVisual()}
async function atualizarCache(){try{contratosCache=await listarDocumentos("contratos")}catch{contratosCache=[]}if(podeVincularBanco()){try{contasBancariasCache=await listarDocumentos("contasBancarias")}catch{contasBancariasCache=[]}}else contasBancariasCache=[]}

async function sincronizarEmpresa(empresaId){
  if(!empresaId||!podeConfigurar())return{alterados:0};
  const [contratos,contas]=await Promise.all([listarDocumentosEmpresa("contratos",empresaId),listarDocumentosEmpresa(COLECAO,empresaId)]);
  const agora=new Date(),inicio={ano:agora.getFullYear(),mes0:agora.getMonth()},existentes=contas.filter(x=>x.origem==="contrato"&&x.origemContratoId),map=new Map(existentes.map(x=>[`${x.origemContratoId}|${x.competencia}`,x])),desejados=new Map();
  for(const c of contratos){
    if(!ativo(c))continue;
    for(let q=0;q<=HORIZONTE_MESES;q++){
      const {ano,mes0}=addMeses(inicio.ano,inicio.mes0,q);if(!contratoVigenteNoMes(c,ano,mes0))continue;
      const valor=valorContratoNoMes(c,ano,mes0);if(!valor)continue;
      const competencia=comp(ano,mes0);desejados.set(`${c.id}|${competencia}`,{c,competencia,valor,vencimento:dataVencimento(ano,mes0,n(c.diaVencimento))});
    }
  }
  let alterados=0;
  for(const [k,x] of desejados){
    const ant=map.get(k);if(ant&&["pago","estornado"].includes(ant.status))continue;
    const reabrir=ant?.status==="cancelado"&&ant?.canceladoAutomatico===true;
    const payload={grupoId:grupoAtualId(),empresaId,fornecedor:x.c.fornecedor||"Fornecedor",descricao:x.c.objeto||`Contrato ${x.c.numero||""}`,documento:x.c.numero||"",categoria:"Contrato",valor:Math.abs(x.valor),valorBaseContrato:Math.abs(n(x.c.valorMensal)),regraReajuste:snapshotReajusteContrato(x.c),vencimento:x.vencimento,responsavel:x.c.responsavel||"",observacao:"Obrigação gerada automaticamente pelo módulo de Contratos. Alterações de valor, índice, periodicidade ou vigência do contrato recalculam vencimentos futuros ainda abertos.",origem:"contrato",origemContratoId:x.c.id,contratoReferencia:x.c.numero||x.c.fornecedor||"Contrato",competencia:x.competencia,contaBancariaId:x.c.contaBancariaIdContasPagar||"",contaBancariaNome:x.c.contaBancariaNomeContasPagar||"",status:reabrir?"aberto":ant?.status||"aberto",canceladoAutomatico:false,atualizadoEm:serverTimestamp()};
    if(!ant){payload.criadoPor=state.usuario?.id||"";payload.criadoEm=serverTimestamp()}
    await setDoc(doc(db,COLECAO,ant?.id||docId(x.c.id,x.competencia)),payload,{merge:true});alterados++;
  }
  for(const ant of existentes){const k=`${ant.origemContratoId}|${ant.competencia}`;if(desejados.has(k)||["pago","estornado","cancelado"].includes(ant.status))continue;await setDoc(doc(db,COLECAO,ant.id),{status:"cancelado",canceladoAutomatico:true,motivoCancelamento:"Contrato deixou de gerar esta obrigação.",atualizadoEm:serverTimestamp()},{merge:true});alterados++}
  if(alterados)emitirAlteracao("contasPagar");return{alterados};
}
async function sincronizarSelecionadas(){const ids=[...new Set(empresasSelecionadasIds().filter(Boolean))];for(const id of ids)await sincronizarEmpresa(id)}
function agendar(fn=sincronizarSelecionadas,ms=180){clearTimeout(timer);timer=setTimeout(()=>{fila=fila.then(fn).catch(e=>console.warn("Contas a Pagar · contratos:",e))},ms)}

function instalarEventos(){
  document.addEventListener("click",e=>{const edit=e.target?.closest?.("[data-ctr-edit]");if(edit){contratoEditandoId=edit.dataset.ctrEdit||"";setTimeout(()=>{montarIntegracao();preencherToggle(contratoEditandoId)},40);return}if(e.target?.closest?.("#btnNovoContrato")){contratoEditandoId="";setTimeout(()=>{montarIntegracao();preencherToggle("")},40)}},true);
  document.addEventListener("submit",e=>{if(e.target?.id!=="formContrato")return;montarIntegracao();const chk=document.getElementById("contratoContasPagarAtivo"),ativoChk=chk?.checked===true,sel=document.getElementById("contratoContaBancariaAp"),cAtual=contratosCache.find(x=>x.id===contratoEditandoId),contaId=podeVincularBanco()?sel?.value||"":cAtual?.contaBancariaIdContasPagar||"",conta=contasBancariasCache.find(x=>x.id===contaId),contaNomeValor=contaNome(conta)||cAtual?.contaBancariaNomeContasPagar||"";if(ativoChk){const dia=n(document.getElementById("contratoDiaVencimento")?.value),valor=n(document.getElementById("contratoValor")?.value),m=document.getElementById("mensagemContrato");if(dia<1||dia>31||valor<=0||!contaId){e.preventDefault();e.stopImmediatePropagation();if(m)m.textContent=!contaId?"Para enviar ao Contas a Pagar, selecione também a conta bancária prevista.":"Para enviar ao Contas a Pagar, informe valor mensal e dia de pagamento entre 1 e 31.";return}}salvamentoPendente={ativo:ativoChk,contaId:ativoChk?contaId:"",contaNome:ativoChk?contaNomeValor:""}},true);
  window.addEventListener("sig:contract-driver-changed",e=>agendar(async()=>{const id=e.detail?.contratoId;if(!id)return;try{if(salvamentoPendente){await atualizarDocumento("contratos",id,{contasPagarAtivo:salvamentoPendente.ativo,contaBancariaIdContasPagar:salvamentoPendente.contaId,contaBancariaNomeContasPagar:salvamentoPendente.contaNome});salvamentoPendente=null}await atualizarCache();const c=contratosCache.find(x=>x.id===id);if(c?.empresaId)await sincronizarEmpresa(c.empresaId)}catch(err){console.error("Falha ao sincronizar contrato com Contas a Pagar",err)}},60));
  window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="contratos")agendar(async()=>{await atualizarCache();await sincronizarSelecionadas()},350)});
  window.addEventListener("sig:empresa-changed",()=>agendar(async()=>{await atualizarCache();preencherContaContrato(contratoEditandoId);await sincronizarSelecionadas()},300));
  window.addEventListener("sig:ready",()=>agendar(async()=>{montarIntegracao();await atualizarCache();preencherContaContrato(contratoEditandoId);await sincronizarSelecionadas()},700));
}
montarIntegracao();instalarEventos();atualizarCache();