import { admin, state } from "./core.js";
import { $, esc, listarDocumentos, serverTimestamp, emitirAlteracao } from "./shared.js";
import { confirmarAcaoAdministrativa, atualizarComAuditoria, excluirComAuditoria } from "./admin-actions.js";

let timer=null,busy=false,observer=null;
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};

function agendar(){clearTimeout(timer);timer=setTimeout(decorar,80)}
async function base(){
  const [veiculos,manutencoes]=await Promise.all([listarDocumentos("veiculos"),listarDocumentos("manutencoesFrota")]);
  return{veiculos,manutencoes,vmap:new Map(veiculos.map(v=>[v.id,v])),mmap:new Map(manutencoes.map(m=>[m.id,m]))}
}
function recarregar(){emitirAlteracao("frota");window.dispatchEvent(new CustomEvent("sig:page",{detail:{pagina:"frota"}}))}
function obrigacoes(v){return Array.isArray(v?.obrigacoes)?v.obrigacoes:[]}

async function estornarManutencao(id){
  const b=await base(),m=b.mmap.get(id);if(!m||m.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar manutenção",descricao:`A manutenção “${m.descricao||id}” continuará no histórico, marcada como estornada e fora das leituras operacionais de execução.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar manutenção",perigosa:true});if(!ok)return;
  await atualizarComAuditoria({colecao:"manutencoesFrota",id,empresaId:m.empresaId,modulo:"frota",acao:"estorno_manutencao",motivo:ok.motivo,resumo:`Estorno de manutenção ${m.descricao||id}`,snapshotAntes:m,alteracoes:{status:"cancelada",estornado:true,motivoEstorno:ok.motivo,estornadoPor:state.usuario?.id||"",estornadoPorNome:state.usuario?.nome||"Administrador",estornadoEm:serverTimestamp()}});recarregar()
}
async function excluirManutencao(id){
  const b=await base(),m=b.mmap.get(id);if(!m)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Excluir manutenção",descricao:`A manutenção “${m.descricao||id}” será removida fisicamente. Use somente para registro duplicado, teste ou cadastro indevido.`,motivoLabel:"Justificativa obrigatória da exclusão",confirmarTexto:"Excluir definitivamente",perigosa:true});if(!ok)return;
  await excluirComAuditoria({colecao:"manutencoesFrota",id,empresaId:m.empresaId,modulo:"frota",motivo:ok.motivo,resumo:`Exclusão física de manutenção ${m.descricao||id}`,snapshotAntes:m});recarregar()
}
async function estornarObrigacao(vid,oid){
  const b=await base(),v=b.vmap.get(vid),o=obrigacoes(v).find(x=>x.id===oid);if(!v||!o||o.estornado===true)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar obrigação da frota",descricao:`${o.tipo||"Obrigação"} de ${v.placa||"veículo"} continuará no histórico, mas será marcada como estornada.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar obrigação",perigosa:true});if(!ok)return;
  const arr=obrigacoes(v).map(x=>x.id===oid?{...x,status:"cancelado",estornado:true,motivoEstorno:ok.motivo,estornadoPor:state.usuario?.id||"",estornadoPorNome:state.usuario?.nome||"Administrador",estornadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()}:x);
  await atualizarComAuditoria({colecao:"veiculos",id:vid,empresaId:v.empresaId,modulo:"frota",acao:"estorno_obrigacao",motivo:ok.motivo,resumo:`Estorno de obrigação ${o.tipo||oid} · ${v.placa||""}`,snapshotAntes:o,alteracoes:{obrigacoes:arr}});recarregar()
}
async function excluirObrigacao(vid,oid){
  const b=await base(),v=b.vmap.get(vid),o=obrigacoes(v).find(x=>x.id===oid);if(!v||!o)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Excluir obrigação da frota",descricao:`O registro ${o.tipo||"obrigação"} de ${v.placa||"veículo"} será removido fisicamente. O evento ficará preservado na auditoria administrativa.`,motivoLabel:"Justificativa obrigatória da exclusão",confirmarTexto:"Excluir definitivamente",perigosa:true});if(!ok)return;
  await atualizarComAuditoria({colecao:"veiculos",id:vid,empresaId:v.empresaId,modulo:"frota",acao:"exclusao_obrigacao",motivo:ok.motivo,resumo:`Exclusão de obrigação ${o.tipo||oid} · ${v.placa||""}`,snapshotAntes:o,alteracoes:{obrigacoes:obrigacoes(v).filter(x=>x.id!==oid)}});recarregar()
}
async function excluirVeiculo(id){
  const b=await base(),v=b.vmap.get(id);if(!v)return;
  const relacionados=b.manutencoes.filter(m=>m.veiculoId===id).length,obs=obrigacoes(v).length;
  if(v.imobilizadoId||relacionados||obs){alert(`Este veículo possui vínculos e não pode ser apagado fisicamente.\n\nImobilizado: ${v.imobilizadoId?"sim":"não"}\nManutenções: ${relacionados}\nObrigações: ${obs}\n\nUse Baixado/Inativo e corrija os registros relacionados por estorno.`);return}
  const ok=await confirmarAcaoAdministrativa({titulo:"Excluir veículo sem histórico",descricao:`${v.placa||"O veículo"} não possui Imobilizado, manutenção ou obrigação vinculada. A exclusão física deve ser usada apenas para cadastro indevido/teste.`,motivoLabel:"Justificativa obrigatória da exclusão",confirmarTexto:"Excluir veículo",perigosa:true});if(!ok)return;
  await excluirComAuditoria({colecao:"veiculos",id,empresaId:v.empresaId,modulo:"frota",motivo:ok.motivo,resumo:`Exclusão física do veículo ${v.placa||id}`,snapshotAntes:v});recarregar()
}

function addBtn(td,texto,classe,fn,marca){if(!td||td.querySelector(`[data-${marca}]`))return;const b=document.createElement("button");b.type="button";b.className=`btn-acao ${classe||""}`.trim();b.textContent=texto;b.dataset[marca]="1";b.addEventListener("click",fn);td.appendChild(b)}

async function decorar(){
  if(!admin()||busy)return;
  const tv=$("listaVeiculos"),to=$("listaObrigacoes"),tm=$("listaManutencoes");if(!tv&&!to&&!tm)return;
  busy=true;
  try{
    const b=await base();
    tv?.querySelectorAll("[data-fc]").forEach(btn=>{const id=btn.dataset.fc,td=btn.closest("td");addBtn(td,"Excluir","perigo",()=>excluirVeiculo(id),"adminExcluirVeiculo")});
    tm?.querySelectorAll("[data-me]").forEach(btn=>{const id=btn.dataset.me,m=b.mmap.get(id),td=btn.closest("td"),tr=btn.closest("tr");if(!m)return;if(m.estornado===true){tr?.classList.add("sig-admin-estornado");btn.remove();const c=tr?.querySelector("td:nth-child(2)");if(c&&!c.querySelector(".sig-admin-estorno-info"))c.insertAdjacentHTML("beforeend",`<span class="sig-admin-estorno-info">Estornada · ${esc(m.motivoEstorno||"")}</span>`)}else addBtn(td,"Estornar","",()=>estornarManutencao(id),"adminEstornarManut");addBtn(td,"Excluir","perigo",()=>excluirManutencao(id),"adminExcluirManut")});
    if(to){
      const filtro=$("filtroObrigTipo")?.value||"",flat=[];
      b.veiculos.forEach(v=>obrigacoes(v).forEach(o=>{if(!filtro||o.tipo===filtro)flat.push({...o,veiculoId:v.id,veiculo:v})}));flat.sort((a,c)=>String(a.vencimento||"").localeCompare(String(c.vencimento||"")));
      [...to.querySelectorAll("tr")].forEach((tr,i)=>{const o=flat[i];if(!o)return;const td=tr.lastElementChild;if(o.estornado===true){tr.classList.add("sig-admin-estornado");const c=tr.querySelector("td:nth-child(3)");if(c&&!c.querySelector(".sig-admin-estorno-info"))c.insertAdjacentHTML("beforeend",`<span class="sig-admin-estorno-info">Estornada · ${esc(o.motivoEstorno||"")}</span>`)}else addBtn(td,"Estornar","",()=>estornarObrigacao(o.veiculoId,o.id),"adminEstornarObrig");addBtn(td,"Excluir","perigo",()=>excluirObrigacao(o.veiculoId,o.id),"adminExcluirObrig")})
    }
  }catch(e){console.warn("Ações administrativas da Frota indisponíveis",e)}finally{busy=false}
}

function instalar(){if(observer)return;observer=new MutationObserver(agendar);observer.observe(document.body,{childList:true,subtree:true});agendar()}
window.addEventListener("sig:ready",instalar);window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="frota")agendar()});window.addEventListener("sig:data-changed",agendar);instalar();
