import { admin, state } from "./core.js";
import {
  $, listarDocumentos, empresaUnicaSelecionadaId, periodoAno, periodoChave, emitirAlteracao
} from "./shared.js";
import {
  confirmarAcaoAdministrativa,
  atualizarComAuditoria,
  executarCorrecoesComAuditoria
} from "./admin-actions.js";

const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
let observer=null,timer=null,busy=false,planejamentoBusy=false;
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const agora=()=>new Date().toISOString();
const usuarioMeta=motivo=>({
  estornado:true,
  motivoEstorno:motivo,
  estornadoPor:state.usuario?.id||"",
  estornadoPorNome:state.usuario?.nome||"Administrador",
  estornadoEm:agora()
});

function agendar(){clearTimeout(timer);timer=setTimeout(decorar,70)}
function botao(container,{chave,texto,onClick,perigo=true}){
  if(!container||container.querySelector(`[data-admin-input="${chave}"]`))return;
  const b=document.createElement("button");
  b.type="button";b.className=`btn-acao${perigo?" perigo":""}`;b.textContent=texto;b.dataset.adminInput=chave;
  b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();onClick()});container.appendChild(b);
}
async function docs(colecao){try{return await listarDocumentos(colecao)}catch(e){console.warn(`Correção administrativa: falha ao ler ${colecao}`,e);return[]}}
function atualizarTela(btnId,modulo="controladoria"){$(btnId)?.click();emitirAlteracao(modulo)}

async function estornarVenda(id){
  const x=(await docs("vendas")).find(v=>v.id===id);if(!x||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar venda",descricao:`A venda “${x.documento||x.cliente||id}” permanecerá no histórico, ficará cancelada e deixará de compor venda, faturamento e comissão.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar venda",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"vendas",id:x.id,empresaId:x.empresaId,modulo:"vendas",acao:"estorno",motivo:ok.motivo,resumo:`Estorno administrativo da venda ${x.documento||x.id}`,snapshotAntes:x,alteracoes:{status:"cancelada",...usuarioMeta(ok.motivo)}});atualizarTela("btnSalesAtualizar","vendas")}catch(e){console.error(e);alert("Não foi possível estornar a venda.")}
}

async function estornarConsorcio(id){
  const x=(await docs("consorcios")).find(v=>v.id===id);if(!x||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar cadastro de consórcio",descricao:`Use este estorno para cadastro indevido, duplicidade ou erro material. “${x.descricao||x.administradora||id}” ficará cancelado e preservado no histórico.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar consórcio",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"consorcios",id:x.id,empresaId:x.empresaId,modulo:"consorcios",acao:"estorno",motivo:ok.motivo,resumo:`Estorno administrativo do consórcio ${x.descricao||x.id}`,snapshotAntes:x,alteracoes:{status:"cancelado",...usuarioMeta(ok.motivo)}});atualizarTela("btnAtualizarConsorcioV1","consorcios")}catch(e){console.error(e);alert("Não foi possível estornar o consórcio.")}
}

async function estornarTitulo(id){
  const x=(await docs("inadimplenciaTitulos")).find(v=>v.id===id);if(!x||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar título de inadimplência",descricao:`O título “${x.documento||id}” será marcado como cancelado por correção administrativa e continuará disponível no histórico.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar título",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"inadimplenciaTitulos",id:x.id,empresaId:x.empresaId,modulo:"inadimplencia",acao:"estorno",motivo:ok.motivo,resumo:`Estorno administrativo do título ${x.documento||x.id}`,snapshotAntes:x,alteracoes:{status:"cancelado",...usuarioMeta(ok.motivo)}});atualizarTela("btnInadAtualizar","inadimplencia")}catch(e){console.error(e);alert("Não foi possível estornar o título.")}
}

async function estornarPremissa(id){
  const x=(await docs("premissasPlanejamento")).find(v=>v.id===id);if(!x||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar premissa",descricao:`A premissa “${x.nome||id}” será inativada por correção administrativa. Budget e Forecast deixarão de considerá-la nas competências futuras aplicáveis.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar premissa",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"premissasPlanejamento",id:x.id,empresaId:x.empresaId,modulo:"premissas",acao:"estorno",motivo:ok.motivo,resumo:`Estorno administrativo da premissa ${x.nome||x.id}`,snapshotAntes:x,alteracoes:{ativo:false,...usuarioMeta(ok.motivo)}});window.dispatchEvent(new CustomEvent("sig:empresa-changed"));emitirAlteracao("premissas")}catch(e){console.error(e);alert("Não foi possível estornar a premissa.")}
}

async function estornarBem(id){
  const x=(await docs("imobilizados")).find(v=>v.id===id);if(!x||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar cadastro de Imobilizado / CAPEX",descricao:`Use somente para ficha indevida ou duplicada. Para baixa real de um bem, utilize o status Baixado. O estorno cancelará “${x.descricao||id}” e desligará as integrações automáticas.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar ficha",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"imobilizados",id:x.id,empresaId:x.empresaId,modulo:"imobilizado",acao:"estorno",motivo:ok.motivo,resumo:`Estorno administrativo do Imobilizado/CAPEX ${x.descricao||x.id}`,snapshotAntes:x,alteracoes:{status:"cancelado",integrarBalanco:false,integrarPlanejamento:false,...usuarioMeta(ok.motivo)}});atualizarTela("btnAtualizarBemV1","imobilizado")}catch(e){console.error(e);alert("Não foi possível estornar a ficha do bem.")}
}

async function estornarInputMensal(){
  const emp=empresaUnicaSelecionadaId(),p=periodoChave(),ano=periodoAno(),cc=$("inputV6Centro")?.value||"";
  if(!emp||!/^m\d{2}$/.test(p)||!cc)return alert("Selecione uma única empresa, uma competência mensal e um Centro/bloco antes de estornar.");
  const mi=Number(p.slice(1))-1,mes=MESES[mi],competencia=`${ano}-${p.slice(1)}`;if(!mes)return;
  const arr=(await docs("realizadoMensal")).filter(x=>x.empresaId===emp&&Number(x.exercicio)===Number(ano)&&(x.centroCustoId||"")===cc&&x.legadoArquivado!==true&&x.duplicadoArquivado!==true&&n(x.valores?.[mes])!==0);
  if(!arr.length)return alert("Não há valores persistidos diferentes de zero nessa competência para estornar.");
  if(arr.length>440)return alert("A competência possui registros demais para uma correção atômica. Faça o estorno por blocos menores.");
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar competência do Input Mensal",descricao:`Serão zerados ${arr.length} valor(es) persistidos em ${competencia} no bloco selecionado. Os demais meses permanecem intactos e o snapshot anterior será registrado na auditoria.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar competência",perigosa:true});if(!ok)return;
  const meta={tipo:"estorno_competencia",competencia,motivo:ok.motivo,por:state.usuario?.id||"",porNome:state.usuario?.nome||"Administrador",em:agora()};
  const operacoes=arr.map(x=>({tipo:"update",colecao:"realizadoMensal",id:x.id,alteracoes:{valores:{...(x.valores||{}),[mes]:0},ultimaCorrecaoAdministrativa:meta}}));
  const snapshot=arr.map(x=>({id:x.id,contaId:x.contaId,valorAnterior:n(x.valores?.[mes])}));
  try{await executarCorrecoesComAuditoria({operacoes,empresaId:emp,modulo:"input_mensal",acao:"estorno_competencia",colecao:"realizadoMensal",documentoId:`${emp}:${competencia}:${cc}`,motivo:ok.motivo,resumo:`Estorno de ${arr.length} valor(es) do Input Mensal em ${competencia}`,snapshotAntes:snapshot});atualizarTela("btnAtualizarInputV6","realizado")}catch(e){console.error(e);alert("Não foi possível estornar a competência.")}
}

async function estornarDetalhePlanejamento(btn){
  if(planejamentoBusy)return;
  const tr=btn.closest("[data-plan-detail]"),id=tr?.dataset.planDetail||"";if(!tr||!id||id.startsWith("new_"))return false;
  const pagina=btn.closest("section.pagina"),pageId=pagina?.id||"",cenario=pageId.includes("budget")?"budget":pageId.includes("forecast")?"forecast":"";if(!cenario)return false;
  const emp=empresaUnicaSelecionadaId(),ano=periodoAno(),versao=$(`${pageId}-versao`)?.value||"",conta=tr.dataset.conta||"",cc=tr.dataset.cc||"";
  const todos=await docs("planejamentoDetalhes"),alvo=todos.find(x=>x.id===id);if(!alvo)return false;
  const ok=await confirmarAcaoAdministrativa({titulo:`Estornar sublinha de ${cenario==="budget"?"Budget":"Forecast"}`,descricao:`A sublinha “${alvo.descricao||id}” será inativada de forma auditável. A linha agregada será recalculada no mesmo batch.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar sublinha",perigosa:true});if(!ok)return true;
  planejamentoBusy=true;
  try{
    const restantes=todos.filter(d=>d.id!==id&&d.status!=="inativo"&&d.cenario===cenario&&d.empresaId===emp&&Number(d.exercicio)===Number(ano)&&d.versao===versao&&d.contaId===conta&&(d.centroCustoId||"")===(cc||""));
    const valores=Object.fromEntries(MESES.map(m=>[m,restantes.reduce((s,d)=>s+n(d.valores?.[m]),0)]));
    const colecaoLinha=cenario==="budget"?"budgetLinhas":"forecastLinhas",linhas=(await docs(colecaoLinha)).filter(d=>d.tipoRegistro!=="budget_meta"&&d.empresaId===emp&&Number(d.exercicio)===Number(ano)&&d.versao===versao&&d.contaId===conta&&(d.centroCustoId||"")===(cc||""));
    const meta=usuarioMeta(ok.motivo),operacoes=[{tipo:"update",colecao:"planejamentoDetalhes",id,alteracoes:{status:"inativo",...meta}}];
    linhas.forEach(l=>operacoes.push({tipo:"update",colecao:colecaoLinha,id:l.id,alteracoes:{valores,ultimaCorrecaoAdministrativa:{tipo:"estorno_sublinha",detalheId:id,motivo:ok.motivo,em:agora()}}}));
    await executarCorrecoesComAuditoria({operacoes,empresaId:emp,modulo:cenario,acao:"estorno_sublinha",colecao:"planejamentoDetalhes",documentoId:id,motivo:ok.motivo,resumo:`Estorno da sublinha ${alvo.descricao||id} em ${cenario}`,snapshotAntes:{detalhe:alvo,linhas:linhas.map(l=>({id:l.id,valores:l.valores}))}});
    $(`${pageId}-atualizar`)?.click();emitirAlteracao(cenario);
  }catch(e){console.error(e);alert("Não foi possível estornar a sublinha de planejamento.")}finally{planejamentoBusy=false}
  return true;
}

function decorar(){
  if(busy||!admin())return;busy=true;
  try{
    document.querySelectorAll("#salesLista [data-sales-edit]").forEach(edit=>{const id=edit.dataset.salesEdit,acao=edit.closest(".acoes-tabela"),tr=edit.closest("tr");if(!id||!acao||tr?.classList.contains("sales-cancelada"))return;botao(acao,{chave:`venda:${id}`,texto:"Estornar ADM",onClick:()=>estornarVenda(id)})});
    document.querySelectorAll("#listaConsorciosV1 [data-cons-v1-edit]").forEach(edit=>{const id=edit.dataset.consV1Edit,acao=edit.closest(".cons-v1-actions"),tr=edit.closest("tr");if(!id||!acao||/Cancelado/i.test(tr?.textContent||""))return;botao(acao,{chave:`consorcio:${id}`,texto:"Estornar ADM",onClick:()=>estornarConsorcio(id)})});
    document.querySelectorAll("#inadLista [data-inad-edit]").forEach(edit=>{const id=edit.dataset.inadEdit,acao=edit.closest(".inad-acoes");if(!id||!acao)return;botao(acao,{chave:`inad:${id}`,texto:"Estornar ADM",onClick:()=>estornarTitulo(id)})});
    document.querySelectorAll("#listaPremissasV4 [data-prem-v4-edit]").forEach(edit=>{const id=edit.dataset.premV4Edit,td=edit.closest("td"),tr=edit.closest("tr");if(!id||!td||/Inativa/i.test(tr?.textContent||""))return;botao(td,{chave:`premissa:${id}`,texto:"Estornar ADM",onClick:()=>estornarPremissa(id)})});
    document.querySelectorAll("#listaBensV1 [data-bem-edit]").forEach(edit=>{const id=edit.dataset.bemEdit,td=edit.closest("td"),tr=edit.closest("tr");if(!id||!td||/Cancelado/i.test(tr?.textContent||""))return;botao(td,{chave:`bem:${id}`,texto:"Estornar ADM",onClick:()=>estornarBem(id)})});
    const z=$("btnZerarInputV6");if(z&&!$("btnEstornarInputV6")){const b=document.createElement("button");b.id="btnEstornarInputV6";b.type="button";b.className="btn-secundario";b.textContent="Estornar competência";b.addEventListener("click",estornarInputMensal);z.after(b)}
  }finally{busy=false}
}

function instalar(){
  if(observer)return;observer=new MutationObserver(agendar);observer.observe(document.body,{childList:true,subtree:true});agendar();
  document.addEventListener("click",async e=>{const b=e.target.closest?.("[data-plan-rem]");if(!b||!admin()||b.dataset.adminBypass==="1")return;const tr=b.closest("[data-plan-detail]"),id=tr?.dataset.planDetail||"";if(!id||id.startsWith("new_"))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();await estornarDetalhePlanejamento(b)},true);
}

window.addEventListener("sig:ready",instalar);
window.addEventListener("sig:page",agendar);
window.addEventListener("sig:data-changed",agendar);
instalar();
