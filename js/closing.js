import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { $, on, esc, msg, state, db, permite } from "./core.js";
import { empresaAtualId, listarDocumentos, criarDocumento, atualizarDocumento, dataBr, emitirAlteracao } from "./shared.js";

const pagina=$("pagina-controladoria");
let tarefas=[],cabecalhos=[],usuarios=[],busy=false;
const hoje=()=>new Date().toISOString().slice(0,10);
const competenciaAtual=()=>new Date().toISOString().slice(0,7);
const podeGerir=()=>permite("controladoria","editar")||permite("controladoria","fechamento");
const podeFechar=()=>permite("controladoria","editar")||permite("controladoria","fecharCompetencia");

const PADRAO=[
  ["bancos","Conciliações bancárias concluídas",1],
  ["provisoes","Provisões e contratos recorrentes revisados",1],
  ["realizado","Realizado importado / lançado",2],
  ["dre","DRE gerencial revisada",3],
  ["desvios","Desvios relevantes justificados",4],
  ["capex","CAPEX revisado",4],
  ["forecast","Forecast atualizado",5],
  ["caixa","Fluxo de caixa atualizado",5],
  ["prestacao","Prestação de Contas preparada",6]
];

function dataDmais(comp,dia){const[a,m]=comp.split("-").map(Number),d=new Date(Date.UTC(a,m,Math.max(1,dia)));return d.toISOString().slice(0,10)}
function montar(){
  const tabs=pagina?.querySelector(".fpa-tabs");if(!tabs||$("tabFechamento"))return;
  const tab=document.createElement("button");tab.id="tabFechamento";tab.className="fpa-tab";tab.dataset.fpaTab="fechamento";tab.type="button";tab.textContent="Fechamento";tabs.appendChild(tab);
  const s=document.createElement("section");s.className="fpa-view hidden";s.dataset.fpaView="fechamento";s.innerHTML=`
    <div class="pagina-cabecalho interno"><div><h3>Cockpit de Fechamento Mensal</h3><p>Responsáveis, prazos e etapas do fechamento da empresa ativa.</p></div><div class="acoes-cabecalho"><button id="btnCriarChecklistFechamento" class="btn-secundario" type="button">Criar checklist padrão</button><button id="btnConcluirFechamento" class="btn-primario" type="button">Concluir competência</button></div></div>
    <div class="fpa-toolbar fechamento-toolbar"><div class="campo"><label for="fechamentoCompetencia">Competência</label><input id="fechamentoCompetencia" type="month"></div><button id="btnAtualizarFechamento" class="btn-secundario" type="button">Atualizar</button><span id="fechamentoMensagem" class="mensagem-form"></span></div>
    <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Progresso</span><strong id="fechamentoProgresso">—</strong><small id="fechamentoStatusGeral">—</small></div><div class="kpi-card"><span>Concluídas</span><strong id="fechamentoConcluidas">—</strong><small>etapas finalizadas</small></div><div class="kpi-card"><span>Pendentes</span><strong id="fechamentoPendentes">—</strong><small>em aberto / andamento</small></div><div class="kpi-card"><span>Vencidas</span><strong id="fechamentoVencidas">—</strong><small>prazo ultrapassado</small></div></div>
    <div class="fechamento-progress"><i id="fechamentoBarra"></i></div>
    <section class="lista-card"><div class="lista-cabecalho"><div><h3>Régua de fechamento</h3><p id="fechamentoResumo">Carregando...</p></div></div><div class="tabela-container"><table class="tabela fechamento-tabela"><thead><tr><th>Etapa</th><th>Responsável</th><th>Prazo</th><th>Status</th><th>Observação</th><th>Ação</th></tr></thead><tbody id="listaFechamento"><tr><td colspan="6">Carregando...</td></tr></tbody></table></div></section>`;
  pagina.appendChild(s);
  const st=document.createElement("style");st.textContent=`.fechamento-toolbar{align-items:end}.fechamento-progress{height:8px;background:#e9eef2;border-radius:999px;overflow:hidden;margin:12px 0 16px}.fechamento-progress i{display:block;height:100%;width:0;background:#0c9488;transition:width .2s}.fechamento-tabela select,.fechamento-tabela input{min-width:120px}.fechamento-tabela input[type="text"]{min-width:240px}.fechamento-tarefa strong{display:block;color:#0b1f33}.fechamento-tarefa small{display:block;color:#667085;margin-top:3px}.fechamento-vencida{background:#fff7f5}.fechamento-fechado{border:1px solid #8ad4ca;background:#eafaf7;color:#087a6f;border-radius:999px;padding:4px 8px;font-size:9px;font-weight:850}`;document.head.appendChild(st);
  on(tab,"click",()=>{document.querySelectorAll(".fpa-tab").forEach(b=>b.classList.toggle("ativo",b===tab));document.querySelectorAll(".fpa-view").forEach(v=>v.classList.toggle("hidden",v!==s));carregar()});
  on($("btnAtualizarFechamento"),"click",carregar);on($("btnCriarChecklistFechamento"),"click",criarPadrao);on($("btnConcluirFechamento"),"click",alternarFechamento);on($("fechamentoCompetencia"),"change",carregar);
}

async function carregarUsuarios(){
  if(!podeGerir()){usuarios=[{id:state.usuario.id,nome:state.usuario.nome||state.usuario.email||"Eu"}];return}
  try{const s=await getDocs(query(collection(db,"usuarios"),where("grupoId","==",state.usuario.grupoId)));usuarios=[];s.forEach(r=>{const d=r.data();if(d.ativo===true)usuarios.push({id:r.id,...d})})}catch{usuarios=[{id:state.usuario.id,nome:state.usuario.nome||state.usuario.email||"Eu"}]}
}
function responsavelNome(id,nome=""){const u=usuarios.find(x=>x.id===id);return u?.nome||u?.email||nome||"Não definido"}
function optsUsuarios(valor){return usuarios.map(u=>`<option value="${esc(u.id)}" ${u.id===valor?"selected":""}>${esc(u.nome||u.email||u.id)}</option>`).join("")}
function cabecalho(comp){return cabecalhos.find(x=>x.competencia===comp)}
function statusNome(v){return{aberto:"Aberto",em_andamento:"Em andamento",concluido:"Concluído",bloqueado:"Bloqueado"}[v]||v}

function render(){
  const comp=$("fechamentoCompetencia")?.value||competenciaAtual(),arr=tarefas.filter(x=>x.competencia===comp).sort((a,b)=>(a.ordem||0)-(b.ordem||0)),cab=cabecalho(comp),fechado=cab?.status==="concluido";
  const concl=arr.filter(x=>x.status==="concluido").length,pend=arr.length-concl,venc=arr.filter(x=>x.status!=="concluido"&&x.prazo&&x.prazo<hoje()).length,prog=arr.length?Math.round(concl/arr.length*100):0;
  $("fechamentoProgresso").textContent=`${prog}%`;$("fechamentoConcluidas").textContent=concl;$("fechamentoPendentes").textContent=pend;$("fechamentoVencidas").textContent=venc;$("fechamentoBarra").style.width=`${prog}%`;$("fechamentoStatusGeral").textContent=fechado?"Competência fechada":"Fechamento em andamento";
  $("fechamentoResumo").innerHTML=fechado?`<span class="fechamento-fechado">FECHADO</span> ${cab.fechadoPorNome?`por ${esc(cab.fechadoPorNome)}`:""}${cab.fechadoEm?` · ${esc(String(cab.fechadoEm).slice(0,10).split("-").reverse().join("/"))}`:""}`:`${arr.length} etapa(s) · ${venc} vencida(s)`;
  $("btnCriarChecklistFechamento")?.classList.toggle("hidden",!podeGerir()||arr.length>0||fechado);$("btnConcluirFechamento")?.classList.toggle("hidden",!podeFechar());if($("btnConcluirFechamento"))$("btnConcluirFechamento").textContent=fechado?"Reabrir competência":"Concluir competência";
  const tb=$("listaFechamento");if(!tb)return;if(!arr.length){tb.innerHTML='<tr><td colspan="6">Nenhuma régua criada para esta competência.</td></tr>';return}
  tb.innerHTML=arr.map(t=>{const minha=t.responsavelId===state.usuario.id,edit=podeGerir()&&!fechado,exec=(minha||permite("controladoria","fecharCompetencia"))&&!fechado;return`<tr class="${t.status!=="concluido"&&t.prazo&&t.prazo<hoje()?"fechamento-vencida":""}"><td class="fechamento-tarefa"><strong>${esc(t.titulo)}</strong><small>D+${t.diaFechamento||"-"}</small></td><td>${edit?`<select data-fech-resp="${t.id}">${optsUsuarios(t.responsavelId)}</select>`:esc(responsavelNome(t.responsavelId,t.responsavelNome))}</td><td>${edit?`<input type="date" data-fech-prazo="${t.id}" value="${esc(t.prazo||"")}">`:dataBr(t.prazo)}</td><td>${exec||edit?`<select data-fech-status="${t.id}"><option value="aberto" ${t.status==="aberto"?"selected":""}>Aberto</option><option value="em_andamento" ${t.status==="em_andamento"?"selected":""}>Em andamento</option><option value="concluido" ${t.status==="concluido"?"selected":""}>Concluído</option></select>`:esc(statusNome(t.status))}</td><td>${exec||edit?`<input type="text" data-fech-obs="${t.id}" value="${esc(t.observacao||"")}" placeholder="Observação">`:esc(t.observacao||"-")}</td><td>${exec||edit?`<button class="btn-acao destaque" data-fech-salvar="${t.id}" type="button">Salvar</button>`:"-"}</td></tr>`}).join("");
  tb.querySelectorAll("[data-fech-salvar]").forEach(b=>on(b,"click",()=>salvarTarefa(b.dataset.fechSalvar)));
}

async function carregar(){if(busy||!empresaAtualId()||!permite("controladoria"))return;busy=true;msg($("fechamentoMensagem"),"Carregando...");try{await carregarUsuarios();[tarefas,cabecalhos]=await Promise.all([listarDocumentos("fechamentoTarefas"),listarDocumentos("fechamentosMensais")]);render();msg($("fechamentoMensagem"),"")}catch(e){console.error("Fechamento:",e);msg($("fechamentoMensagem"),"As regras do Firebase para Fechamento ainda precisam ser publicadas.")}finally{busy=false}}

async function criarPadrao(){if(!podeGerir())return;const comp=$("fechamentoCompetencia")?.value||competenciaAtual();if(tarefas.some(x=>x.competencia===comp))return alert("Esta competência já possui checklist.");if(!confirm(`Criar a régua padrão de fechamento para ${comp}?`))return;msg($("fechamentoMensagem"),"Criando checklist...");try{for(let i=0;i<PADRAO.length;i++){const[id,titulo,dia]=PADRAO[i];await criarDocumento("fechamentoTarefas",{competencia:comp,tarefaId:id,titulo,ordem:i+1,diaFechamento:dia,prazo:dataDmais(comp,dia),responsavelId:state.usuario.id,responsavelNome:state.usuario.nome||state.usuario.email||state.usuario.id,status:"aberto",observacao:""})}await criarDocumento("fechamentosMensais",{competencia:comp,status:"aberto"});emitirAlteracao("fechamento");await carregar()}catch(e){console.error(e);msg($("fechamentoMensagem"),"Não foi possível criar a régua de fechamento.")}}

async function salvarTarefa(id){const t=tarefas.find(x=>x.id===id);if(!t)return;const resp=$("listaFechamento")?.querySelector(`[data-fech-resp="${id}"]`),prazo=$("listaFechamento")?.querySelector(`[data-fech-prazo="${id}"]`),status=$("listaFechamento")?.querySelector(`[data-fech-status="${id}"]`),obs=$("listaFechamento")?.querySelector(`[data-fech-obs="${id}"]`),rid=resp?.value||t.responsavelId,u=usuarios.find(x=>x.id===rid);const d={status:status?.value||t.status,observacao:obs?.value.trim()||""};if(podeGerir()){d.responsavelId=rid;d.responsavelNome=u?.nome||u?.email||t.responsavelNome||rid;d.prazo=prazo?.value||t.prazo}try{await atualizarDocumento("fechamentoTarefas",id,d);emitirAlteracao("fechamento");await carregar()}catch(e){console.error(e);alert("Não foi possível atualizar esta etapa.")}}

async function alternarFechamento(){if(!podeFechar())return;const comp=$("fechamentoCompetencia")?.value||competenciaAtual(),arr=tarefas.filter(x=>x.competencia===comp),cab=cabecalho(comp);if(!cab)return alert("Crie primeiro o checklist do fechamento.");const fechado=cab.status==="concluido";if(!fechado&&(!arr.length||arr.some(x=>x.status!=="concluido")))return alert("Ainda existem etapas pendentes. Conclua a régua antes de fechar a competência.");if(!confirm(`${fechado?"Reabrir":"Concluir"} a competência ${comp}?`))return;try{await atualizarDocumento("fechamentosMensais",cab.id,{status:fechado?"aberto":"concluido",fechadoEm:fechado?"":new Date().toISOString(),fechadoPor:fechado?"":state.usuario.id,fechadoPorNome:fechado?"":state.usuario.nome||state.usuario.email||state.usuario.id});emitirAlteracao("fechamento");await carregar()}catch(e){console.error(e);alert("Não foi possível alterar o status do fechamento.")}}

montar();if($("fechamentoCompetencia"))$("fechamentoCompetencia").value=competenciaAtual();
window.addEventListener("sig:empresa-changed",()=>{tarefas=[];cabecalhos=[];if($("tabFechamento")?.classList.contains("ativo"))carregar()});window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="fechamento"&&$("tabFechamento")?.classList.contains("ativo"))carregar()});
