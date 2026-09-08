import { admin, state } from "./core.js";
import { $, esc, listarDocumentos, serverTimestamp, emitirAlteracao } from "./shared.js";
import { confirmarAcaoAdministrativa, atualizarComAuditoria, excluirComAuditoria } from "./admin-actions.js";

let busy=false,timer=null,observer=null;

function removerCancelamentoManual(){
  const select=$("caixaStatus");if(!select)return;
  select.querySelector('option[value="cancelado"]')?.remove();
}

function agendar(){clearTimeout(timer);timer=setTimeout(decorar,60)}

async function registros(){
  try{return await listarDocumentos("fluxoCaixaLancamentos")}catch(e){console.warn("Não foi possível carregar lançamentos para ações administrativas",e);return[]}
}

function infoEstorno(x){
  if(!x?.estornado)return"";
  const quem=x.estornadoPorNome||"Administrador",motivo=x.motivoEstorno||"Sem motivo informado";
  return `<span class="sig-admin-estorno-info">Estornado por ${esc(quem)} · ${esc(motivo)}</span>`;
}

async function estornar(id){
  const arr=await registros(),x=arr.find(r=>r.id===id);if(!x||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({
    titulo:"Estornar lançamento do Fluxo de Caixa",
    descricao:`O lançamento “${x.descricao||"sem descrição"}” permanecerá no histórico, mas deixará de compor saldos e projeções.`,
    exigirMotivo:true,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar lançamento",perigosa:true
  });
  if(!ok)return;
  try{
    await atualizarComAuditoria({
      colecao:"fluxoCaixaLancamentos",id:x.id,empresaId:x.empresaId,modulo:"fluxo_caixa",acao:"estorno",
      motivo:ok.motivo,resumo:`Estorno de ${x.descricao||x.id}`,snapshotAntes:x,
      alteracoes:{status:"cancelado",estornado:true,motivoEstorno:ok.motivo,estornadoPor:state.usuario?.id||"",estornadoPorNome:state.usuario?.nome||"Administrador",estornadoEm:serverTimestamp()}
    });
    emitirAlteracao("fluxoCaixa");
    $("tabFluxoCaixa")?.click();
  }catch(e){console.error(e);alert("Não foi possível estornar o lançamento.")}
}

async function excluir(id){
  const arr=await registros(),x=arr.find(r=>r.id===id);if(!x)return;
  const ok=await confirmarAcaoAdministrativa({
    titulo:"Excluir fisicamente lançamento",
    descricao:`Esta ação remove definitivamente “${x.descricao||"este lançamento"}” do Fluxo de Caixa. Use apenas para duplicidade, teste ou cadastro indevido. O evento administrativo ficará registrado em auditoria.`,
    exigirMotivo:true,motivoLabel:"Justificativa obrigatória da exclusão",confirmarTexto:"Excluir definitivamente",perigosa:true
  });
  if(!ok)return;
  try{
    await excluirComAuditoria({colecao:"fluxoCaixaLancamentos",id:x.id,empresaId:x.empresaId,modulo:"fluxo_caixa",motivo:ok.motivo,resumo:`Exclusão física de ${x.descricao||x.id}`,snapshotAntes:x});
    emitirAlteracao("fluxoCaixa");
    $("tabFluxoCaixa")?.click();
  }catch(e){console.error(e);alert("Não foi possível excluir o lançamento.")}
}

async function decorar(){
  removerCancelamentoManual();
  if(!admin())return;
  const tbody=$("listaFluxoCaixa");if(!tbody||busy)return;
  busy=true;
  try{
    const arr=await registros(),mapa=new Map(arr.map(x=>[x.id,x]));
    tbody.querySelectorAll("[data-edit-lanc-caixa]").forEach(edit=>{
      const id=edit.dataset.editLancCaixa,x=mapa.get(id),tr=edit.closest("tr"),td=edit.closest("td");if(!x||!tr||!td)return;
      if(x.estornado===true||x.status==="cancelado"){
        tr.classList.add("sig-admin-estornado");
        const principal=tr.querySelector(".celula-principal");
        if(x.estornado===true&&principal&&!principal.querySelector(".sig-admin-estorno-info"))principal.insertAdjacentHTML("beforeend",infoEstorno(x));
        edit.remove();
      }
      if(td.dataset.adminCorrigido==="1")return;
      td.dataset.adminCorrigido="1";
      if(x.estornado!==true&&x.status!=="cancelado"){
        const b=document.createElement("button");b.className="btn-acao";b.type="button";b.textContent="Estornar";b.dataset.adminEstornarCaixa=id;b.addEventListener("click",()=>estornar(id));td.appendChild(b)
      }
      const del=document.createElement("button");del.className="btn-acao perigo";del.type="button";del.textContent="Excluir";del.dataset.adminExcluirCaixa=id;del.addEventListener("click",()=>excluir(id));td.appendChild(del)
    });
    tbody.querySelectorAll("tr").forEach(tr=>{
      const b=tr.querySelector("[data-admin-excluir-caixa]");if(b)return;
      const est=tr.querySelector("[data-admin-estornar-caixa]");if(est)return;
    });
  }finally{busy=false}
}

function instalarObserver(){
  if(observer)return;
  observer=new MutationObserver(agendar);observer.observe(document.body,{childList:true,subtree:true});
  removerCancelamentoManual();agendar();
}

window.addEventListener("sig:ready",instalarObserver);
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="controladoria")agendar()});
window.addEventListener("sig:data-changed",agendar);
instalarObserver();
