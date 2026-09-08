import { admin, state } from "./core.js";
import {
  $, listarDocumentos, empresaUnicaSelecionadaId, emitirAlteracao
} from "./shared.js";
import {
  confirmarAcaoAdministrativa,
  atualizarComAuditoria,
  excluirComAuditoria,
  executarCorrecoesComAuditoria
} from "./admin-actions.js";
import {
  VERSAO_MASCARA_PLANO,
  codigoSinteticoValido,
  codigoAnaliticoValido
} from "./account-mask.js";

let observer=null,timer=null,busy=false;
const agora=()=>new Date().toISOString();
const metaEstorno=motivo=>({
  estornado:true,
  motivoEstorno:motivo,
  estornadoPor:state.usuario?.id||"",
  estornadoPorNome:state.usuario?.nome||"Administrador",
  estornadoEm:agora()
});
async function docs(colecao){return await listarDocumentos(colecao)}
function agendar(){clearTimeout(timer);timer=setTimeout(decorar,80)}
function addBotao(container,{key,label,onClick,classe="btn-acao perigo"}){
  if(!container||container.querySelector(`[data-master-admin="${key}"]`))return;
  const b=document.createElement("button");b.type="button";b.className=classe;b.dataset.masterAdmin=key;b.textContent=label;
  b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();onClick()});container.appendChild(b);
}
function refresh(id,modulo){$(id)?.click();emitirAlteracao(modulo)}

async function estornarContaBancaria(id){
  const x=(await docs("contasBancarias")).find(v=>v.id===id);if(!x||x.status==="inativo"||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar conta bancária",descricao:`A conta “${x.nome||x.banco||id}” será inativada e deixará de compor o saldo de abertura das projeções futuras. Os lançamentos históricos permanecem preservados.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar conta",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"contasBancarias",id:x.id,empresaId:x.empresaId,modulo:"fluxo_caixa",acao:"estorno_cadastro",motivo:ok.motivo,resumo:`Estorno da conta bancária ${x.nome||x.id}`,snapshotAntes:x,alteracoes:{status:"inativo",...metaEstorno(ok.motivo)}});$("tabFluxoCaixa")?.click();emitirAlteracao("caixa")}catch(e){console.error(e);alert("Não foi possível estornar a conta bancária.")}
}
async function estornarFixo(id){
  const x=(await docs("fluxoCaixaFixos")).find(v=>v.id===id);if(!x||x.status==="inativo"||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar compromisso fixo",descricao:`O compromisso “${x.descricao||id}” será inativado. Provisões já geradas não serão apagadas; devem ser estornadas individualmente quando indevidas.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar compromisso",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"fluxoCaixaFixos",id:x.id,empresaId:x.empresaId,modulo:"fluxo_caixa",acao:"estorno_cadastro",motivo:ok.motivo,resumo:`Estorno do compromisso fixo ${x.descricao||x.id}`,snapshotAntes:x,alteracoes:{status:"inativo",...metaEstorno(ok.motivo)}});$("tabFluxoCaixa")?.click();emitirAlteracao("caixa")}catch(e){console.error(e);alert("Não foi possível estornar o compromisso fixo.")}
}
async function estornarCentro(id){
  const x=(await docs("centrosCusto")).find(v=>v.id===id);if(!x||x.status==="inativo"||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar Centro de Custo",descricao:`O Centro “${x.codigo||""} · ${x.nome||id}” será inativado. O histórico e os vínculos já existentes permanecem preservados.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar Centro",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"centrosCusto",id:x.id,empresaId:x.empresaId,modulo:"centros_custo",acao:"estorno_cadastro",motivo:ok.motivo,resumo:`Estorno do Centro de Custo ${x.codigo||x.id}`,snapshotAntes:x,alteracoes:{status:"inativo",...metaEstorno(ok.motivo)}});refresh("btnAtualizarCentroV2","centrosCusto")}catch(e){console.error(e);alert("Não foi possível estornar o Centro de Custo.")}
}
async function estornarVendedor(id){
  const x=(await docs("vendedores")).find(v=>v.id===id);if(!x||x.status==="inativo"||x.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar cadastro de vendedor",descricao:`O vendedor “${x.nome||id}” será inativado. As vendas históricas e os snapshots de comissão permanecem preservados.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar vendedor",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"vendedores",id:x.id,empresaId:x.empresaId,modulo:"vendas",acao:"estorno_cadastro",motivo:ok.motivo,resumo:`Estorno do vendedor ${x.nome||x.id}`,snapshotAntes:x,alteracoes:{status:"inativo",...metaEstorno(ok.motivo)}});refresh("btnSalesAtualizar","vendas")}catch(e){console.error(e);alert("Não foi possível estornar o vendedor.")}
}

async function excluirContrato(id){
  const x=(await docs("contratos")).find(v=>v.id===id);if(!x)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Excluir contrato definitivamente",descricao:`A exclusão física de “${x.numero||x.fornecedor||id}” só deve ser usada para duplicidade, teste ou cadastro indevido sem histórico necessário. O documento será removido do Firestore.`,motivoLabel:"Justificativa obrigatória da exclusão",confirmarTexto:"Excluir definitivamente",perigosa:true});if(!ok)return;
  try{await excluirComAuditoria({colecao:"contratos",id:x.id,empresaId:x.empresaId,modulo:"contratos",acao:"exclusao_fisica",motivo:ok.motivo,resumo:`Exclusão física do contrato ${x.numero||x.id}`,snapshotAntes:x});window.dispatchEvent(new CustomEvent("sig:page",{detail:{pagina:"contratos"}}));emitirAlteracao("contratos")}catch(e){console.error(e);alert("Não foi possível excluir o contrato. Confirme se as Rules administrativas desta versão foram publicadas.")}
}

function estruturaPlanoAtual(c){return c?.versaoMascara===VERSAO_MASCARA_PLANO&&(codigoSinteticoValido(c?.codigo)||codigoAnaliticoValido(c?.codigo))}
function ramo(conta,todas){
  const ids=new Set([conta.id]);let mudou=true;
  while(mudou){mudou=false;for(const c of todas)if(c.contaPaiId&&ids.has(c.contaPaiId)&&!ids.has(c.id)){ids.add(c.id);mudou=true}}
  return todas.filter(c=>ids.has(c.id));
}
async function referenciasPlano(ids){
  const set=new Set(ids);
  const [real,bud,fore,det,prem,imob,ccs,classif,planej,veic]=await Promise.all([
    docs("realizadoMensal"),docs("budgetLinhas"),docs("forecastLinhas"),docs("planejamentoDetalhes"),docs("premissasPlanejamento"),
    docs("imobilizados"),docs("centrosCusto"),docs("classificacoesContas"),docs("planejamentoMensal"),docs("veiculos").catch(()=>[])
  ]);
  const ach=[];
  [["Realizado",real],["Budget",bud],["Forecast",fore],["Detalhamento",det],["Classificações",classif],["Planejamento legado",planej]].forEach(([nome,arr])=>{const q=arr.filter(d=>set.has(d.contaId)||set.has(d.contaGerencialId));if(q.length)ach.push(`${nome}: ${q.length}`)});
  const ps=prem.filter(p=>set.has(p.contaGerencialId));if(ps.length)ach.push(`Premissas: ${ps.length}`);
  const bs=imob.filter(b=>[b.contaAtivoId,b.contaDepreciacaoAcumuladaId,b.contaDepreciacaoId].some(v=>set.has(v)));if(bs.length)ach.push(`Imobilizado/CAPEX: ${bs.length}`);
  const cs=ccs.filter(c=>(Array.isArray(c.contasPermitidas)?c.contasPermitidas:[]).some(v=>set.has(v)));if(cs.length)ach.push(`Centros de Custo: ${cs.length}`);
  const vs=veic.filter(v=>[v.contaAtivoId,v.contaDepreciacaoAcumuladaId,v.contaDepreciacaoId].some(x=>set.has(x)));if(vs.length)ach.push(`Frota: ${vs.length}`);
  return ach;
}
async function excluirContaPlano(id){
  const todas=await docs("planoContasGerencial"),c=todas.find(v=>v.id===id);if(!c)return;
  const alvo=ramo(c,todas),ids=alvo.map(x=>x.id);let usos;
  try{usos=await referenciasPlano(ids)}catch(e){console.error(e);return alert("Não foi possível validar todas as referências. A exclusão foi bloqueada por segurança.")}
  if(usos.length)return alert(`Exclusão bloqueada. Existem referências neste cadastro:\n\n${usos.join("\n")}\n\nUse a inativação para preservar o histórico.`);
  if(alvo.length>440)return alert("O ramo possui registros demais para uma exclusão administrativa atômica.");
  const ok=await confirmarAcaoAdministrativa({titulo:"Excluir conta/ramo definitivamente",descricao:`Serão removidas ${alvo.length} conta(s) sem referências, começando por “${c.codigo||""} · ${c.nome||id}”. Esta ação é exclusiva para cadastro de teste/erro.`,motivoLabel:"Justificativa obrigatória da exclusão",confirmarTexto:"Excluir definitivamente",perigosa:true});if(!ok)return;
  const operacoes=[...alvo].reverse().map(x=>({tipo:"delete",colecao:"planoContasGerencial",id:x.id}));
  try{await executarCorrecoesComAuditoria({operacoes,empresaId:c.empresaId,modulo:"plano_contas",acao:"exclusao_fisica",colecao:"planoContasGerencial",documentoId:c.id,motivo:ok.motivo,resumo:`Exclusão física de ${alvo.length} conta(s) sem referência`,snapshotAntes:alvo});window.dispatchEvent(new CustomEvent("sig:empresa-changed"));emitirAlteracao("planoContas")}catch(e){console.error(e);alert("Não foi possível excluir a conta/ramo. Confirme as Firestore Rules.")}
}
async function limparLegadoPlano(){
  const todas=await docs("planoContasGerencial"),emp=empresaUnicaSelecionadaId(),cand=todas.filter(c=>c.empresaId===emp&&!estruturaPlanoAtual(c));
  if(!cand.length)return alert("Não há contas legadas/teste para limpar nesta empresa.");let usos;
  try{usos=await referenciasPlano(cand.map(c=>c.id))}catch(e){console.error(e);return alert("Não foi possível validar todas as referências. A limpeza foi bloqueada por segurança.")}
  if(usos.length)return alert(`Limpeza bloqueada. Existem referências nas contas antigas:\n\n${usos.join("\n")}`);
  if(cand.length>440)return alert("Há registros demais para uma limpeza administrativa atômica.");
  const ok=await confirmarAcaoAdministrativa({titulo:"Limpar contas legadas/teste",descricao:`Serão excluídas definitivamente ${cand.length} conta(s) antigas sem referências.`,motivoLabel:"Justificativa obrigatória da limpeza",confirmarTexto:"Excluir contas antigas",perigosa:true});if(!ok)return;
  try{await executarCorrecoesComAuditoria({operacoes:cand.map(x=>({tipo:"delete",colecao:"planoContasGerencial",id:x.id})),empresaId:emp,modulo:"plano_contas",acao:"limpeza_legado",colecao:"planoContasGerencial",documentoId:`legado:${emp}`,motivo:ok.motivo,resumo:`Limpeza administrativa de ${cand.length} conta(s) legadas/teste`,snapshotAntes:cand});window.dispatchEvent(new CustomEvent("sig:empresa-changed"));emitirAlteracao("planoContas")}catch(e){console.error(e);alert("Não foi possível limpar o legado. Confirme as Firestore Rules.")}
}

function protegerAcaoFisicaSeNaoAdmin(el){if(el&&!admin()){el.classList.add("hidden");el.disabled=true}}
function decorar(){
  if(busy)return;busy=true;
  try{
    document.querySelectorAll("[data-ctr-del]").forEach(protegerAcaoFisicaSeNaoAdmin);
    document.querySelectorAll("[data-v6-excluir]").forEach(protegerAcaoFisicaSeNaoAdmin);
    protegerAcaoFisicaSeNaoAdmin($("btnLimparLegadoV6"));
    if(!admin())return;
    document.querySelectorAll("#listaContasCaixa [data-edit-conta-caixa]").forEach(card=>{const id=card.dataset.editContaCaixa;if(!id||card.dataset.adminDecorated)return;card.dataset.adminDecorated="1";const wrap=document.createElement("div");wrap.className="acoes-tabela";addBotao(wrap,{key:`conta-caixa:${id}`,label:"Estornar ADM",onClick:()=>estornarContaBancaria(id)});card.after(wrap)});
    document.querySelectorAll("#listaFixosCaixa [data-edit-fixo]").forEach(card=>{const id=card.dataset.editFixo;if(!id||card.dataset.adminDecorated)return;card.dataset.adminDecorated="1";const wrap=document.createElement("div");wrap.className="acoes-tabela";addBotao(wrap,{key:`fixo:${id}`,label:"Estornar ADM",onClick:()=>estornarFixo(id)});card.after(wrap)});
    document.querySelectorAll("#listaCentrosV2 [data-ccv2-edit]").forEach(edit=>{const id=edit.dataset.ccv2Edit,acoes=edit.closest(".conta-acoes-inline"),tr=edit.closest("tr");if(!id||!acoes||/Inativo/i.test(tr?.textContent||""))return;addBotao(acoes,{key:`centro:${id}`,label:"Estornar ADM",onClick:()=>estornarCentro(id)})});
    document.querySelectorAll("#salesVendedoresLista [data-vend-edit]").forEach(edit=>{const id=edit.dataset.vendEdit,td=edit.closest("td"),tr=edit.closest("tr");if(!id||!td||/Inativo/i.test(tr?.textContent||""))return;addBotao(td,{key:`vendedor:${id}`,label:"Estornar ADM",onClick:()=>estornarVendedor(id)})});
  }finally{busy=false}
}
function instalar(){
  if(observer)return;observer=new MutationObserver(agendar);observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener("click",e=>{
    const ctr=e.target.closest?.("[data-ctr-del]");if(ctr){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(admin())excluirContrato(ctr.dataset.ctrDel);else alert("Exclusão física é exclusiva do Administrador e exige reautenticação.");return}
    const pc=e.target.closest?.("[data-v6-excluir]");if(pc){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(admin())excluirContaPlano(pc.dataset.v6Excluir);else alert("Exclusão física é exclusiva do Administrador e exige reautenticação.");return}
    const leg=e.target.closest?.("#btnLimparLegadoV6");if(leg){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(admin())limparLegadoPlano();else alert("Limpeza física é exclusiva do Administrador e exige reautenticação.")}
  },true);agendar();
}
window.addEventListener("sig:ready",instalar);window.addEventListener("sig:page",agendar);window.addEventListener("sig:data-changed",agendar);instalar();
