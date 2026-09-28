import { admin, state } from "./core.js";
import { $, listarDocumentos, emitirAlteracao } from "./shared.js";
import { confirmarAcaoAdministrativa, atualizarComAuditoria, excluirComAuditoria } from "./admin-actions.js";

let observer=null,timer=null,busy=false;
const agora=()=>new Date().toISOString();
const metaEstorno=motivo=>({estornado:true,motivoEstorno:motivo,estornadoPor:state.usuario?.id||"",estornadoPorNome:state.usuario?.nome||"Administrador",estornadoEm:agora()});
async function docs(colecao){return await listarDocumentos(colecao)}
function agendar(){clearTimeout(timer);timer=setTimeout(decorar,80)}
function addBotao(container,{key,label,onClick}){if(!container||container.querySelector(`[data-master-admin="${key}"]`))return;const b=document.createElement("button");b.type="button";b.className="btn-acao perigo";b.dataset.masterAdmin=key;b.textContent=label;b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();onClick()});container.appendChild(b)}
function refresh(id,modulo){$(id)?.click();emitirAlteracao(modulo)}

async function estornarVendedor(id){
  const x=(await docs("vendedores")).find(v=>v.id===id);if(!x||x.status==="inativo"||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar cadastro de vendedor",descricao:`O vendedor “${x.nome||id}” será inativado. As vendas históricas e os snapshots de comissão permanecem preservados.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar vendedor",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"vendedores",id:x.id,empresaId:x.empresaId,modulo:"vendas",acao:"estorno_cadastro",motivo:ok.motivo,resumo:`Estorno do vendedor ${x.nome||x.id}`,snapshotAntes:x,alteracoes:{status:"inativo",...metaEstorno(ok.motivo)}});refresh("btnSalesAtualizar","vendas")}catch(e){console.error(e);alert("Não foi possível estornar o vendedor.")}
}
async function excluirContrato(id){
  const x=(await docs("contratos")).find(v=>v.id===id);if(!x)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Excluir contrato definitivamente",descricao:`A exclusão física de “${x.numero||x.fornecedor||id}” só deve ser usada para duplicidade, teste ou cadastro indevido sem histórico necessário.`,motivoLabel:"Justificativa obrigatória da exclusão",confirmarTexto:"Excluir definitivamente",perigosa:true});if(!ok)return;
  try{await excluirComAuditoria({colecao:"contratos",id:x.id,empresaId:x.empresaId,modulo:"contratos",acao:"exclusao_fisica",motivo:ok.motivo,resumo:`Exclusão física do contrato ${x.numero||x.id}`,snapshotAntes:x});window.dispatchEvent(new CustomEvent("sig:page",{detail:{pagina:"contratos"}}));emitirAlteracao("contratos")}catch(e){console.error(e);alert("Não foi possível excluir o contrato.")}
}
function protegerContrato(){document.querySelectorAll("[data-ctr-del]").forEach(el=>{if(!admin()){el.classList.add("hidden");el.disabled=true}})}
function decorar(){
  if(busy)return;busy=true;
  try{
    protegerContrato();if(!admin())return;
    document.querySelectorAll("#salesVendedoresLista [data-vend-edit]").forEach(edit=>{const id=edit.dataset.vendEdit,td=edit.closest("td"),tr=edit.closest("tr");if(!id||!td||/Inativo/i.test(tr?.textContent||""))return;addBotao(td,{key:`vendedor:${id}`,label:"Estornar ADM",onClick:()=>estornarVendedor(id)})});
  }finally{busy=false}
}
function instalar(){
  if(observer)return;observer=new MutationObserver(agendar);observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener("click",e=>{const ctr=e.target.closest?.("[data-ctr-del]");if(!ctr)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(admin())excluirContrato(ctr.dataset.ctrDel);else alert("Exclusão física é exclusiva do Administrador e exige reautenticação.")},true);
  agendar();
}
window.addEventListener("sig:ready",instalar);window.addEventListener("sig:page",agendar);window.addEventListener("sig:data-changed",agendar);instalar();
